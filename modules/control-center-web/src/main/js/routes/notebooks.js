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

var router = require('express').Router();
var crypto = require('crypto');
var db = require('../db');

/**
 * Get notebooks names accessed for user account.
 *
 * @param req Request.
 * @param res Response.
 */
router.post('/list', function (req, res) {
    var user_id = req.currentUserId();

    // Get owned space and all accessed space.
    db.Space.find({$or: [{owner: user_id}, {usedBy: {$elemMatch: {account: user_id}}}]}, function (err, spaces) {
        if (err)
            return res.status(500).send(err.message);

        var space_ids = spaces.map(function (value) {
            return value._id;
        });

        // Get all metadata for spaces.
        db.Notebook.find({space: {$in: space_ids}}).select('_id name').sort('name').exec(function (err, notebooks) {
            if (err)
                return res.status(500).send(err.message);

            res.json(notebooks);
        });
    });
});

/**
 * Get notebook accessed for user account.
 *
 * @param req Request.
 * @param res Response.
 */
router.post('/get', function (req, res) {
    var user_id = req.currentUserId();

    // Get owned space and all accessed space.
    db.Space.find({$or: [{owner: user_id}, {usedBy: {$elemMatch: {account: user_id}}}]}, function (err, spaces) {
        if (err)
            return res.status(500).send(err.message);

        var space_ids = spaces.map(function (value) {
            return value._id;
        });

        // Get all metadata for spaces.
        db.Notebook.findOne({$or: [{space: {$in: space_ids}}, {_id: req.body.noteId}]}).exec(function (err, notebook) {
            if (err)
                return res.status(500).send(err.message);

            res.json(notebook);
        });
    });
});

function _randomValueHex(len) {
    return crypto.randomBytes(Math.ceil(len / 2))
        .toString('hex') // convert to hexadecimal format
        .slice(0, len);  // return required number of characters
}

/**
 * Create new notebook for user account.
 *
 * @param req Request.
 * @param res Response.
 */
router.get('/new', function (req, res) {
    var user_id = req.currentUserId();

    // Get owned space and all accessed space.
    db.Space.findOne({owner: user_id}, function (err, space) {
        if (err)
            return res.status(500).send(err.message);

        var name = 'Notebook' + ' ' + _randomValueHex(8);

        (new db.Notebook({space: space.id, name: name, paragraph: []})).save(function (err, notebook) {
            if (err)
                return res.status(500).send(err.message);

            return res.redirect('/sql/' + notebook._id);
        });
    });
});

module.exports = router;