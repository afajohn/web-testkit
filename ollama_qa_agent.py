import os
import json
import ollama

# --- CONFIGURATION ---
INPUT_FOLDER = 'test_results'    # Folder containing your Playwright JSONs
OUTPUT_FOLDER = 'reports'       # Folder where .md reports will be saved
MODEL_NAME = 'qwen:latest'      # Or your specific qwen model version

# Ensure the output directory exists
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

def generate_report(json_data):
    """Sends JSON to Ollama and returns the generated Markdown string."""
    prompt = f"""
    Act as a Senior QA Automation Engineer. Create a comprehensive report with bullet points 
    based on the following JSON result. Highlight these specific tests:
    - SEO test
    - Brokenlinks count
    - Accessibility
    - GTM

    JSON DATA:
    {json.dumps(json_data, indent=2)}
    """
    
    response = ollama.chat(model=MODEL_NAME, messages=[
        {'role': 'user', 'content': prompt}
    ])
    
    return response['message']['content']

def main():
    # Loop through all files in the input folder
    for filename in os.listdir(INPUT_FOLDER):
        if filename.endswith('.json'):
            file_path = os.path.join(INPUT_FOLDER, filename)
            
            print(f"Processing: {filename}...")
            
            try:
                # Load the JSON content
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Get the report from Ollama
                report_content = generate_report(data)
                
                # Create the output filename (change .json to .md)
                output_filename = filename.replace('.json', '.md')
                output_path = os.path.join(OUTPUT_FOLDER, output_filename)
                
                # Save the report
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(report_content)
                
                print(f"Successfully created: {output_filename}")
                
            except Exception as e:
                print(f"Error processing {filename}: {e}")

if __name__ == "__main__":
    main()