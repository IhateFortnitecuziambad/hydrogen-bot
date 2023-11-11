from flask import Flask, request, send_file
import subprocess
import os

app = Flask(__name__)

def sign_ipa(input_ipa_path, output_ipa_path, p12_path, mobile_prov_path):
    command = [
        './zsign',
        '-k', p12_path,
        '-m', mobile_prov_path,
        '-p', 'nabzclan.vip-fsfs57rh',
        '-o', output_ipa_path,
        input_ipa_path
    ]
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        raise Exception(f'Error: {result.stderr}')
    else:
        print(f'Success: {result.stdout}')

@app.route('/sign', methods=['POST'])
def sign():
    print("Received request to sign IPA")
    input_ipa_file = request.files['input_ipa']
    input_ipa_path = f'./{input_ipa_file.filename}'
    input_ipa_file.save(input_ipa_path)
    
    output_ipa_path = f'./signed_{input_ipa_file.filename}'
    p12_path = './nabzclan.p12'
    mobile_prov_path = './nabzclan.mobileprovision'
    
    try:
        sign_ipa(input_ipa_path, output_ipa_path, p12_path, mobile_prov_path)
        return send_file(output_ipa_path, as_attachment=True)
    finally:
        # Clean up
        if os.path.exists(input_ipa_path):
            os.remove(input_ipa_path)
        if os.path.exists(output_ipa_path):
            os.remove(output_ipa_path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)  # Enable debug mode for more detailed output
