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

var apacheIgnite = require("apache-ignite");
var Ignition = apacheIgnite.Ignition;

Ignition.start(['127.0.0.1:9095'], null, onConnect);

function onConnect(err, ignite) {
    console.log(">>> Cache API example started.");

    ignite.getOrCreateCache("ApiExampleCache", function(err, cache) {
            atomicMapOperations(cache);
        });
}

/**
 * Demonstrates cache operations similar to {@link ConcurrentMap} API. Note that
 * cache API is a lot richer than the JDK {@link ConcurrentMap}.
 */
atomicMapOperations = function(cache) {
    console.log(">>> Cache atomic map operation examples.");

    cache.removeAllFromCache(function(err) {
        cache.getAndPut(1, "1", onGetAndPut.bind(null, cache))
    });
}

function onGetAndPut(cache, err, entry) {
    cache.put(2, "2", onPut.bind(null, cache));
}

function onPut(cache, err) {
    cache.putIfAbsent(4, "44", onPutIfAbsent.bind(null, cache, true));
}

function onPutIfAbsent(cache, expRes, err, res) {
    if (expRes) {
        cache.putIfAbsent(4, "44", onPutIfAbsent.bind(null, cache, false));
    }
    else {
        cache.replaceValue(4, "55", "44", onReplaceValue.bind(null, cache, true));
    }
}

function onReplaceValue(cache, expRes, err, res) {
    if (expRes) {
        cache.replaceValue(4, "555", "44", onReplaceValue.bind(null, cache, false));
    }
    else {
        console.log("End of the example.")
    }
}