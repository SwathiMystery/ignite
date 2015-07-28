/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.ignite.internal.processors.rest.handlers.query;

import org.apache.ignite.*;
import org.apache.ignite.cache.query.*;
import org.apache.ignite.internal.*;
import org.apache.ignite.internal.processors.cache.*;
import org.apache.ignite.internal.processors.query.*;
import org.apache.ignite.internal.processors.rest.*;
import org.apache.ignite.internal.processors.rest.handlers.*;
import org.apache.ignite.internal.processors.rest.request.*;
import org.apache.ignite.internal.util.future.*;
import org.apache.ignite.internal.util.lang.*;
import org.apache.ignite.internal.util.typedef.*;
import org.apache.ignite.internal.util.typedef.internal.*;

import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

import static org.apache.ignite.internal.processors.rest.GridRestCommand.*;

/**
 * Query command handler.
 */
public class QueryCommandHandler extends GridRestCommandHandlerAdapter {
    /** Supported commands. */
    private static final Collection<GridRestCommand> SUPPORTED_COMMANDS = U.sealList(EXECUTE_SQL_QUERY,
        EXECUTE_SQL_FIELDS_QUERY,
        FETCH_SQL_QUERY,
        CLOSE_SQL_QUERY);

    /** Query ID sequence. */
    private static final AtomicLong qryIdGen = new AtomicLong();

    /** Current queries cursors. */
    private final static ConcurrentHashMap<Long, GridTuple3<QueryCursor, Iterator, Boolean>> qryCurs =
        new ConcurrentHashMap<>();

    /** Remove delay. */
    private static int rmvDelay = 0;

    /** Scheduler. */
    private static final ScheduledExecutorService SCHEDULER = Executors.newScheduledThreadPool(1);

    /**
     * @param ctx Context.
     */
    public QueryCommandHandler(GridKernalContext ctx) {
        super(ctx);

        rmvDelay = ctx.config().getConnectorConfiguration().getQueryRemoveDelay();
    }

    /** {@inheritDoc} */
    @Override public Collection<GridRestCommand> supportedCommands() {
        return SUPPORTED_COMMANDS;
    }

    /** {@inheritDoc} */
    @Override public IgniteInternalFuture<GridRestResponse> handleAsync(GridRestRequest req) {
        assert req != null;

        assert SUPPORTED_COMMANDS.contains(req.command());
        assert req instanceof RestSqlQueryRequest : "Invalid type of query request.";

        switch (req.command()) {
            case EXECUTE_SQL_QUERY:
            case EXECUTE_SQL_FIELDS_QUERY: {
                return ctx.closure().callLocalSafe(
                    new ExecuteQueryCallable(ctx, (RestSqlQueryRequest)req), false);
            }

            case FETCH_SQL_QUERY: {
                return ctx.closure().callLocalSafe(
                    new FetchQueryCallable((RestSqlQueryRequest)req), false);
            }

            case CLOSE_SQL_QUERY: {
                return ctx.closure().callLocalSafe(
                    new CloseQueryCallable((RestSqlQueryRequest)req), false);
            }
        }

        return new GridFinishedFuture<>();
    }

    /**
     * Execute query callable.
     */
    private static class ExecuteQueryCallable implements Callable<GridRestResponse> {
        /** Kernal context. */
        private GridKernalContext ctx;

        /** Execute query request. */
        private RestSqlQueryRequest req;

        /**
         * @param ctx Kernal context.
         * @param req Execute query request.
         */
        public ExecuteQueryCallable(GridKernalContext ctx, RestSqlQueryRequest req) {
            this.ctx = ctx;
            this.req = req;
        }

        /** {@inheritDoc} */
        @Override public GridRestResponse call() throws Exception {
            final long qryId = qryIdGen.getAndIncrement();

            try {
                Query qry;

                if (req.typeName() != null) {
                    qry = new SqlQuery(req.typeName(), req.sqlQuery());

                    ((SqlQuery)qry).setArgs(req.arguments());
                }
                else {
                    qry = new SqlFieldsQuery(req.sqlQuery());

                    ((SqlFieldsQuery)qry).setArgs(req.arguments());
                }

                IgniteCache<Object, Object> cache = ctx.grid().cache(req.cacheName());

                if (cache == null)
                    return new GridRestResponse(GridRestResponse.STATUS_FAILED,
                        "No cache with name [cacheName=" + req.cacheName() + "]");

                final QueryCursor qryCur = cache.query(qry);

                Iterator cur = qryCur.iterator();

                qryCurs.put(qryId, new GridTuple3<>(qryCur, cur, true));

                scheduleRemove(qryId);

                CacheQueryResult res = createQueryResult(cur, req, qryId);

                List<GridQueryFieldMetadata> fieldsMeta = ((QueryCursorImpl<?>) qryCur).fieldsMeta();

                res.setFieldsMetadata(convertMetadata(fieldsMeta));

                return new GridRestResponse(res);
            }
            catch (Exception e) {
                qryCurs.remove(qryId);

                return new GridRestResponse(GridRestResponse.STATUS_FAILED, e.getMessage());
            }
        }

        /**
         * @param meta Internal query field metadata.
         * @return Rest query field metadata.
         */
        private Collection<CacheQueryFieldsMetaResult> convertMetadata(Collection<GridQueryFieldMetadata> meta) {
            List<CacheQueryFieldsMetaResult> res = new ArrayList<>();

            if (meta != null) {
                for (GridQueryFieldMetadata info : meta)
                    res.add(new CacheQueryFieldsMetaResult(info));
            }

            return res;
        }
    }

    /**
     * Close query callable.
     */
    private static class CloseQueryCallable implements Callable<GridRestResponse> {
        /** Execute query request. */
        private RestSqlQueryRequest req;

        /**
         * @param req Execute query request.
         */
        public CloseQueryCallable(RestSqlQueryRequest req) {
            this.req = req;
        }

        /** {@inheritDoc} */
        @Override public GridRestResponse call() throws Exception {
            try {
                QueryCursor cur = qryCurs.get(req.queryId()).get1();

                if (cur == null)
                    return new GridRestResponse(GridRestResponse.STATUS_FAILED,
                        "Cannot find query [qryId=" + req.queryId() + "]");

                cur.close();

                qryCurs.remove(req.queryId());

                return new GridRestResponse(true);
            }
            catch (Exception e) {
                qryCurs.remove(req.queryId());

                return new GridRestResponse(GridRestResponse.STATUS_FAILED, e.getMessage());
            }
        }
    }

    /**
     * Fetch query callable.
     */
    private static class FetchQueryCallable implements Callable<GridRestResponse> {
        /** Execute query request. */
        private RestSqlQueryRequest req;

        /**
         * @param req Execute query request.
         */
        public FetchQueryCallable(RestSqlQueryRequest req) {
            this.req = req;
        }

        /** {@inheritDoc} */
        @Override public GridRestResponse call() throws Exception {
            try {
                GridTuple3<QueryCursor, Iterator, Boolean> t = qryCurs.get(req.queryId());

                t.set3(true);

                Iterator cur = t.get2();

                if (cur == null)
                    return new GridRestResponse(GridRestResponse.STATUS_FAILED,
                        "Cannot find query [qryId=" + req.queryId() + "]");

                CacheQueryResult res = createQueryResult(cur, req, req.queryId());

                return new GridRestResponse(res);
            }
            catch (Exception e) {
                qryCurs.remove(req.queryId());

                return new GridRestResponse(GridRestResponse.STATUS_FAILED, e.getMessage());
            }
        }
    }

    /**
     * @param cur Current cursor.
     * @param req Sql request.
     * @param qryId Query id.
     * @return Query result with items.
     */
    private static CacheQueryResult createQueryResult(Iterator cur, RestSqlQueryRequest req, Long qryId) {
        CacheQueryResult res = new CacheQueryResult();

        List<Object> items = new ArrayList<>();

        for (int i = 0; i < req.pageSize() && cur.hasNext(); ++i)
            items.add(cur.next());

        res.setItems(items);

        res.setLast(!cur.hasNext());

        res.setQueryId(qryId);

        if (!cur.hasNext())
            qryCurs.remove(qryId);

        return res;
    }

    /**
     * Schedule remove for query cursor.
     *
     * @param id Query id.
     */
    private static void scheduleRemove(final long id) {
        SCHEDULER.schedule(new CAX() {
            @Override public void applyx() throws IgniteCheckedException {
                GridTuple3<QueryCursor, Iterator, Boolean> t = qryCurs.get(id);

                if (t != null) {
                    if (t.get3()) {
                        t.set3(false);

                        scheduleRemove(id);
                    }
                    else
                        qryCurs.remove(id);
                }
            }
        }, rmvDelay, TimeUnit.SECONDS);
    }
}
