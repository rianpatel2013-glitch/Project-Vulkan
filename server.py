from flask import Flask, render_template
from jinja2 import TemplateNotFound
import os

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

PAGES = {
    '/crew': 'crew.html',
    '/technology/structure': 'structure.html',
    '/technology/software': 'software.html',
    '/technology/capsule': 'capsule.html',
    '/flight-log': 'flight_log.html',
    '/trivia': 'trivia.html',
    '/learn-more': 'learn_more.html',
    '/help': 'help.html',
    '/reference': 'reference.html',
    '/solar-system': 'solar_system.html',
}

def add_page(path, template):
    app.add_url_rule(path, endpoint=template, view_func=lambda: render_template(template))

for path, template in PAGES.items():
    add_page(path, template)

@app.errorhandler(404)
@app.errorhandler(TemplateNotFound)   # route exists, but its page isn't built yet
def not_found(e):
    return render_template(
        'error.html',
        code=404,
        title='Mission Not Found',
        message="This page doesn't exist yet, or hasn't launched. Head back to base."
    ), 404

@app.errorhandler(500)
def server_error(e):
    return render_template(
        'error.html',
        code=500,
        title='Mission Failure',
        message='Something went wrong on our end. Please try again shortly.'
    ), 500

if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 8000))
    HOST = '0.0.0.0'

    if os.environ.get('HOSTING') == 'production':
        # Just set this in PythonAnywhere as the .env file never changes
        from waitress import serve
        serve(app, host=HOST, port=PORT)
    else:
        # Localhost development server (debug mode)
        app.run(host=HOST, port=PORT, debug=True)