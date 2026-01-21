import requests
import time
import urllib.parse
import os
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURATION ---
API_KEY = os.getenv("PSI_API_KEY")  # Replace with your actual key
URLS = [
    "https://russia-ladies.com/"
]

def run_pagespeed_report(target_url, strategy, api_key):
    api_endpoint = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
    
    params = {
        'url': target_url,
        'strategy': strategy,
        'key': api_key
    }
    
    print(f"  Fetching {strategy} data...")
    response = requests.get(api_endpoint, params=params)
    
    if response.status_code != 200:
        return f"Error: {response.status_code}"

    json_data = response.json()
    
    # --- Logic from the JS Sample: Extracting Metrics ---
    # CrUX Metrics (Field Data)
    loading_exp = json_data.get('loadingExperience', {}).get('metrics', {})
    crux_metrics = {
        'FCP (Field)': loading_exp.get('FIRST_CONTENTFUL_PAINT_MS', {}).get('category', 'N/A'),
        'INP (Field)': loading_exp.get('INTERACTION_TO_NEXT_PAINT', {}).get('category', 'N/A')
    }

    # Lighthouse Metrics (Lab Data)
    lh_audits = json_data.get('lighthouseResult', {}).get('audits', {})
    lh_metrics = {
        'FCP (Lab)': lh_audits.get('first-contentful-paint', {}).get('displayValue', 'N/A'),
        'LCP (Lab)': lh_audits.get('largest-contentful-paint', {}).get('displayValue', 'N/A'),
        'TBT (Lab)': lh_audits.get('total-blocking-time', {}).get('displayValue', 'N/A')
    }

    # Generate the web report link
    encoded_url = urllib.parse.quote(target_url, safe='')
    report_link = f"https://pagespeed.web.dev/analysis?url={encoded_url}&strategy={strategy}"

    return {
        "crux": crux_metrics,
        "lighthouse": lh_metrics,
        "link": report_link
    }

# --- EXECUTION ---
for site in URLS:
    print(f"\n--- Site: {site} ---")
    for mode in ['mobile', 'desktop']:
        result = run_pagespeed_report(site, mode, API_KEY)
        
        if isinstance(result, str): # Handle Errors
            print(f"  [{mode.upper()}] {result}")
        else:
            print(f"  [{mode.upper()}] Report: {result['link']}")
            print(f"    - Field FCP: {result['crux']['FCP (Field)']}")
            print(f"    - Lab LCP: {result['lighthouse']['LCP (Lab)']}")
    time.sleep(1) # Polite pause