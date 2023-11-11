from flask import Flask, request, send_from_directory
import os

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # Limit uploads to 100 megabytes

UPLOAD_FOLDER = 'uploads'  # Directory to store uploaded IPA files
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/upload', methods=['POST'])
def upload():
    file = request.files['file']
    if file:
        file_name = file.filename
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], file_name))
        
        download_link = f'http://{request.host}/download/{file_name}'
        return f'IPA file "{file_name}" uploaded successfully! Download link: {download_link}'
    else:
        return 'No file provided in the request.'

@app.route('/download/<filename>')
def download(filename):
    return send_from_directory(directory=app.config['UPLOAD_FOLDER'], path=filename)

@app.errorhandler(413)
def request_entity_too_large(error):
    return 'File too large', 413

if __name__ == '__main__':
    app.run(debug=True)
