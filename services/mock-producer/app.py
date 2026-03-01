from doctest import debug

from flask import Flask
from mock_producer import publish_event

app = Flask(__name__)

@app.route("/hello")
def hello():
    publish_event()
    return 'Published'


if(__name__ == '__main__'):
    app.run(host='0.0.0.0', port=8080)