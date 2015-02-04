module.exports = function (server, mysql_conn, prefix, restify) {
	// Load module dependencies.
	var async = require('async'),
		winston = require('winston');

	// Setup logging module.
	var logger = new winston.Logger({
		transports: [
			new winston.transports.File({ filename: require('path').dirname(require.main.filename) + '/logs/debug.log' })
		],
		exceptionHandlers: [
			new winston.transports.File({ filename: require('path').dirname(require.main.filename) + '/logs/exceptions.log' })
		],
		exitOnError: false
	});

	/**
	 * Retrieves the students of a specific session from the database.
	 */
	server.get(prefix + '/sessions/:session_id/students', function (req, res, next) {
		mysql_conn.query('SELECT * FROM `sessions` WHERE `session_id` = :session_id', { session_id: req.params.session_id }, function (err, results) {
			if (err) return next(err);
			if (!results || !results.length) return next(new restify.errors.NotFoundError('Invalid session ID.'));

			mysql_conn.query('SELECT `students`.* FROM `studentsessions` INNER JOIN `students` ON `studentsessions`.`student_id` = `students`.`student_id` INNER JOIN `sessions` ON `studentsessions`.`session_id` = `sessions`.`session_id` WHERE `studentsessions`.`session_id` = :session_id GROUP BY `students`.`student_id`', { session_id: req.params.session_id }, function (err, results) {
				if (err) return next(err);

				return res.send(results);
			});
		});
	});

	/**
	 * Retrieves the alternative sessions of a specific session from the database.
	 */
	server.get(prefix + '/sessions/:session_id/alternatives', function (req, res, next) {
		mysql_conn.query('SELECT * FROM `sessions` WHERE `session_id` = :session_id', { session_id: req.params.session_id }, function (err, results) {
			if (err) return next(err);
			if (!results || !results.length) return next(new restify.errors.NotFoundError('Invalid session ID.'));

			mysql_conn.query('SELECT `sessions`.* FROM `alternativesessions` INNER JOIN `sessions` ON `alternativesessions`.`secondary_session_id` = `sessions`.`session_id` WHERE `alternativesessions`.`primary_session_id` = :session_id UNION SELECT `sessions`.* FROM `alternativesessions` INNER JOIN `sessions` ON `alternativesessions`.`primary_session_id` = `sessions`.`session_id` WHERE `alternativesessions`.`secondary_session_id` = :session_id', { session_id: req.params.session_id }, function (err, results) {
				if (err) return next(err);

				if (req.query.populate && req.query.populate == 'unit_id') {
					async.each(results, function (session, callback) {
						mysql_conn.query('SELECT * FROM `units` WHERE `unit_id` = :unit_id', { unit_id: session.unit_id }, function (err, units) {
							session.unit_id = units[0];
							callback();
						});
					}, function () {
						return res.send(results);
					});
				} else {
					return res.send(results);
				}
			});
		});
	});

	/**
	 * Retrieves a specific session from the database.
	 */
	server.get(prefix + '/sessions/:session_id', function (req, res, next) {
		mysql_conn.query('SELECT * FROM `sessions` WHERE `session_id` = :session_id', { session_id: req.params.session_id }, function (err, results) {
			if (err) return next(err);
			if (!results || !results.length) return next(new restify.errors.NotFoundError('Invalid session ID.'));

			if (req.query.populate && req.query.populate == 'unit_id') {
				mysql_conn.query('SELECT * FROM `units` WHERE `unit_id` = :unit_id', { unit_id: results[0].unit_id }, function (err, units) {
					results[0].unit_id = units[0];
					return res.send(results[0]);
				});
			} else {
				return res.send(results[0]);
			}
		});
	});

	/**
	 * Retrieves a list of sessions from the database.
	 */
	server.get(prefix + '/sessions', function (req, res, next) {
		mysql_conn.query('SELECT * FROM `sessions`', function (err, results) {
			if (err) return next(err);

			if (req.query.populate && req.query.populate == 'unit_id') {
				async.each(results, function (session, callback) {
					mysql_conn.query('SELECT * FROM `units` WHERE `unit_id` = :unit_id', { unit_id: session.unit_id }, function (err, units) {
						session.unit_id = units[0];
						callback();
					});
				}, function () {
					return res.send(results);
				});
			} else {
				return res.send(results);
			}
		});
	});
};