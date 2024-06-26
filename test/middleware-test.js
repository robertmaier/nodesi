'use strict';

const assert = require('assert');
const http = require('http');
const middleware = require('../lib/middleware');
const createExpressApp = require('./express-app');

describe('A express middleware', () => {
    let app = null;
    let server = null;
    let expressServer = null;
    let port = '';
    let expressPort = '';

    // setup express app, listening server and update port
    beforeEach(() => {
        app = createExpressApp();
        expressServer = app.listen();
        expressPort = expressServer.address().port;

        server = new http.Server();
        server.listen();
        port = server.address().port;
    });

    afterEach(() => {
        expressServer.close();
        expressServer = null;

        server.close();
        server = null;
    });

    it('should fetch external component with a middleware when render is called', (done) => {
        // given
        server.addListener('request', (req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<div>test</div>');
        });
        app.use(middleware());
        app.get('/esi', (req, res) => {
            res.render('single-external-component', {
                port: port,
            });
        });

        // when
        const req = fetch('http://localhost:' + expressPort + '/esi');

        // then
        req.then((response) => response.text())
            .then((text) => {
                assert.equal(text, '<section><div>test</div></section>');
                done();
            })
            .catch(done);
    });

    it('should fetch external component with a middleware when send is called', (done) => {
        // given
        server.addListener('request', (req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<div>test</div>');
        });
        app.use(middleware());
        app.get('/esi', (req, res) => {
            res.send(
                '<section><esi:include src="http://localhost:' +
                    port +
                    '"></esi:include></section>'
            );
        });

        // when
        const req = fetch('http://localhost:' + expressPort + '/esi');

        // then
        req.then((response) => response.text())
            .then((text) => {
                assert.equal(text, '<section><div>test</div></section>');
                done();
            })
            .catch(done);
    });

    it('should fetch external component with a middleware when send is called (buffer version)', (done) => {
        // given
        server.addListener('request', (req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<div>test</div>');
        });
        app.use(middleware());
        app.get('/esi', (req, res) => {
            res.type('text/html');
            res.send(
                Buffer.from(
                    '<section><esi:include src="http://localhost:' +
                        port +
                        '"></esi:include></section>'
                )
            );
        });

        // when
        const req = fetch('http://localhost:' + expressPort + '/esi');

        // then
        req.then((response) => response.text())
            .then((text) => {
                assert.equal(text, '<section><div>test</div></section>');
                done();
            })
            .catch(done);
    });

    it('should respect user defined callback in second parameter', (done) => {
        // given
        server.addListener('request', (req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<div>test</div>');
        });
        app.use(middleware());
        app.get('/esi', (req, res) => {
            res.render('empty-section', (err, str) => {
                str = str.replace('</section>', '<div>test</div></section>');
                res.send(str);
            });
        });

        // when
        const req = fetch('http://localhost:' + expressPort + '/esi');

        // then
        req.then((response) => response.text())
            .then((text) => {
                assert.equal(text, '<section><div>test</div></section>');
                done();
            })
            .catch(done);
    });

    it('should respect user defined callback in third parameter', (done) => {
        // given
        server.addListener('request', (req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<div>test</div>');
        });
        app.use(middleware());
        app.get('/esi', (req, res) => {
            res.render(
                'single-external-component',
                {
                    port: port,
                },
                (err, str) => {
                    str = str.replace('test', 'teststuff');
                    res.send(str);
                }
            );
        });

        // when
        const req = fetch('http://localhost:' + expressPort + '/esi');

        // then
        req.then((response) => response.text())
            .then((text) => {
                assert.equal(text, '<section><div>teststuff</div></section>');
                done();
            })
            .catch(done);
    });

    it('should be configurable', (done) => {
        // given
        server.addListener('request', (req, res) => {
            if (req.url === '/header') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<div>test</div>');
            } else {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('not found');
            }
        });
        app.use(
            middleware({
                baseUrl: 'http://localhost:' + port,
            })
        );
        app.get('/esi', (req, res) => {
            res.render('single-external-component-relative');
        });

        // when
        const req = fetch('http://localhost:' + expressPort + '/esi');

        // then
        req.then((response) => response.text())
            .then((text) => {
                assert.equal(text, '<div>test</div>');
                done();
            })
            .catch(done);
    });

    it('should pass headers', (done) => {
        // given
        server.addListener('request', (req, res) => {
            if (req.headers['x-custom-header']) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<div>test</div>');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('you should not get this');
            }
        });
        app.use(
            middleware({
                baseUrl: 'http://localhost:' + port,
            })
        );
        app.get('/esi', (req, res) => {
            req.esiOptions = {
                headers: {
                    'x-custom-header': 'blah',
                },
            };
            res.render('single-external-component-relative');
        });

        // when
        const req = fetch('http://localhost:' + expressPort + '/esi');

        // then
        req.then((response) => response.text())
            .then((text) => {
                assert.equal(text, '<div>test</div>');
                done();
            })
            .catch(done);
    });

    it('should use request baseUrl headers', (done) => {
        // given
        server.addListener('request', (req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end("I'm included via " + req.url);
        });
        const baseUrl = 'http://localhost:' + port;
        app.use(
            middleware({
                baseUrl,
            })
        );
        app.get('*', (req, res) => {
            req.esiOptions = {
                baseUrl: baseUrl + req.url,
            };
            res.render('single-external-component-template-relative');
        });

        // when
        const req = fetch(
            'http://localhost:' + expressPort + '/foo/bar/index.html'
        );

        // then
        req.then((response) => response.text())
            .then((text) => {
                assert.equal(text, "I'm included via /foo/bar/header.html");
                done();
            })
            .catch(done);
    });

    it('should use request baseUrl headers in send', (done) => {
        // given
        server.addListener('request', (req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end("I'm included via " + req.url);
        });
        const baseUrl = 'http://localhost:' + port;
        app.use(
            middleware({
                baseUrl,
            })
        );
        app.get('*', (req, res) => {
            req.esiOptions = {
                baseUrl: baseUrl + req.url,
            };
            res.send('<esi:include src="header.html"></esi:include>');
        });

        // when
        const req = fetch(
            'http://localhost:' + expressPort + '/foo/bar/index.html'
        );

        // then
        req.then((response) => response.text())
            .then((text) => {
                assert.equal(text, "I'm included via /foo/bar/header.html");
                done();
            })
            .catch(done);
    });

    it('should replace the esi:vars tags with values given in the request', (done) => {
        // given
        server.addListener('request', (req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<div>test</div>');
        });
        app.use(middleware({}));
        app.get('/esi', (req, res) => {
            req.esiOptions = {
                vars: {
                    'SIMPLE_VARIABLE': 'simple value',
                }
            };
            res.render('single-variable', (err, str) => {
                res.send(str);
            });
        });

        // when
        const req = fetch('http://localhost:' + expressPort + '/esi');

        // then
        req.then((response) => response.text())
            .then((text) => {
                assert.equal(text, '<div id="simple-variable">simple value</div>\n');
                done();
            })
            .catch(done);
    });

});
