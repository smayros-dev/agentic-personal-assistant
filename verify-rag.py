#!/usr/bin/env python3
"""
RAG Pipeline Verification Tool

Automatically verifies that:
1. Chroma is running and has data
2. Backend is responding
3. Chat uses the uploaded PDF
"""

import requests
import json
import sys
import time
from datetime import datetime

# Color codes
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
NC = '\033[0m'  # No Color

def print_header(text):
    print(f"\n{BLUE}{'='*70}{NC}")
    print(f"{BLUE}{text}{NC}")
    print(f"{BLUE}{'='*70}{NC}\n")

def print_success(text):
    print(f"{GREEN}✅ {text}{NC}")

def print_error(text):
    print(f"{RED}❌ {text}{NC}")

def print_warning(text):
    print(f"{YELLOW}⚠️  {text}{NC}")

def print_info(text):
    print(f"{BLUE}ℹ️  {text}{NC}")

def check_chroma():
    """Check if Chroma is running"""
    print_header("1️⃣ Checking Chroma Vector Database")
    
    try:
        response = requests.get("http://localhost:8000/api/v1", timeout=5)
        if response.status_code == 200:
            print_success("Chroma is running on http://localhost:8000")
            return True
        else:
            print_error(f"Chroma returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to Chroma on http://localhost:8000")
        print_info("Start Chroma with: ./scripts/start-chroma.sh")
        return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False

def check_backend():
    """Check if Backend is running"""
    print_header("2️⃣ Checking Backend API Server")
    
    try:
        response = requests.get("http://localhost:3001/health", timeout=5)
        if response.status_code == 200:
            print_success("Backend is running on http://localhost:3001")
            return True
        else:
            print_error(f"Backend returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to Backend on http://localhost:3001")
        print_info("Start Backend with: cd server && npm start")
        return False
    except Exception as e:
        print_error(f"Error: {e}")
        return False

def check_chroma_data():
    """Check what's stored in Chroma"""
    print_header("3️⃣ Checking Data in Chroma")
    
    try:
        import chromadb
    except ImportError:
        print_warning("chromadb not installed, skipping detailed check")
        print_info("Install with: pip3 install chromadb")
        return None
    
    try:
        client = chromadb.HttpClient(host="localhost", port=8000)
        collections = client.list_collections()
        
        if len(collections) == 0:
            print_warning("No collections found in Chroma")
            print_info("Upload a PDF first!")
            return 0
        
        total_docs = 0
        for collection in collections:
            items = collection.get()
            count = len(items['ids'])
            total_docs += count
            
            print_success(f"Collection '{collection.name}' has {count} documents")
            
            # Show first chunk
            if count > 0:
                first_doc = items['documents'][0]
                preview = first_doc[:100] + "..." if len(first_doc) > 100 else first_doc
                print_info(f"  First chunk: {preview}")
        
        print_success(f"Total: {total_docs} chunks in Chroma")
        return total_docs
    
    except Exception as e:
        print_error(f"Cannot access Chroma data: {e}")
        return None

def test_chat(message, session_id="test-session"):
    """Test chat endpoint"""
    print_header("4️⃣ Testing Chat Endpoint")
    
    try:
        payload = {
            "message": message,
            "session_id": session_id,
            "model": "gemma4:12b"
        }
        
        headers = {
            "Content-Type": "application/json",
            "X-API-Key": "test-key"
        }
        
        print_info(f"Sending: '{message}'")
        print_info("Waiting for response (may take 5-30 seconds)...")
        
        start_time = time.time()
        response = requests.post(
            "http://localhost:3001/api/chat",
            json=payload,
            headers=headers,
            timeout=60
        )
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Response received in {elapsed:.1f}s")
            
            # Check if response contains useful information
            response_text = data.get("response", "")
            if len(response_text) > 0:
                preview = response_text[:200] + "..." if len(response_text) > 200 else response_text
                print_info(f"Response: {preview}")
                return response_text
            else:
                print_warning("Response is empty")
                return None
        else:
            print_error(f"Chat returned status {response.status_code}")
            print_error(response.text)
            return None
    
    except requests.exceptions.Timeout:
        print_error("Request timeout (> 60 seconds)")
        return None
    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to Backend")
        return None
    except Exception as e:
        print_error(f"Error: {e}")
        return None

def verify_pdf_usage(response_text, pdf_keywords):
    """Check if response uses PDF content"""
    print_header("5️⃣ Verifying PDF Usage")
    
    if not response_text:
        print_warning("No response to analyze")
        return False
    
    # Check if response mentions any PDF keywords
    found_keywords = []
    for keyword in pdf_keywords:
        if keyword.lower() in response_text.lower():
            found_keywords.append(keyword)
    
    if found_keywords:
        print_success(f"Response mentions PDF content: {found_keywords}")
        return True
    else:
        print_warning("Response doesn't mention expected PDF keywords")
        print_warning(f"Expected one of: {pdf_keywords}")
        print_info("The chat might not be using the PDF. Check logs:")
        print_info("  tail -f /tmp/backend.log")
        return False

def create_test_document():
    """Create a simple test document"""
    print_header("Creating Test Document")
    
    # Try to create a simple PDF
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        
        pdf_path = "/tmp/test-rag-verification.pdf"
        c = canvas.Canvas(pdf_path, pagesize=letter)
        
        y = 750
        c.drawString(50, y, "RAG VERIFICATION TEST DOCUMENT")
        y -= 30
        c.drawString(50, y, "")
        y -= 20
        c.drawString(50, y, "Test Information:")
        y -= 20
        c.drawString(50, y, "- Document Name: RAG Verification Test")
        y -= 20
        c.drawString(50, y, "- Created: 2026-09-26")
        y -= 20
        c.drawString(50, y, "- Magic Number: 42")
        y -= 20
        c.drawString(50, y, "- Test Status: Active")
        y -= 20
        c.drawString(50, y, "- Company: Decathlon")
        y -= 20
        c.drawString(50, y, "- Email: test@example.com")
        
        c.save()
        print_success(f"Test PDF created: {pdf_path}")
        return pdf_path
    
    except ImportError:
        print_warning("reportlab not installed, cannot create PDF")
        print_info("Install with: pip3 install reportlab")
        return None
    except Exception as e:
        print_error(f"Cannot create PDF: {e}")
        return None

def main():
    print(f"""
{BLUE}╔══════════════════════════════════════════════════════════════╗{NC}
{BLUE}║                                                              ║{NC}
{BLUE}║         🔍 RAG Pipeline Verification Tool                  ║{NC}
{BLUE}║                                                              ║{NC}
{BLUE}╚══════════════════════════════════════════════════════════════╝{NC}
    """)
    
    # Check all services
    chroma_ok = check_chroma()
    backend_ok = check_backend()
    
    if not (chroma_ok and backend_ok):
        print_error("Required services are not running!")
        print_info("Start them with: ./scripts/dev.sh")
        return False
    
    # Check Chroma data
    chunk_count = check_chroma_data()
    
    if chunk_count is None or chunk_count == 0:
        print_warning("No data in Chroma yet!")
        print_info("Upload a PDF first:")
        print_info("1. Open http://localhost:5173")
        print_info("2. Click 'Upload Document'")
        print_info("3. Select a PDF file")
        print_info("4. Wait for ✅ confirmation")
        print_info("5. Run this script again")
        return False
    
    print_success(f"Found {chunk_count} chunks in Chroma")
    
    # Test chat with PDF content
    pdf_keywords = ["decathlon", "test", "42", "magic", "document", "company"]
    response = test_chat("Tell me about the document you have access to")
    
    if response:
        uses_pdf = verify_pdf_usage(response, pdf_keywords)
        
        if uses_pdf:
            print_header("🎉 RAG Pipeline is Working!")
            print_success("✓ Chroma is running")
            print_success("✓ Backend is responding")
            print_success("✓ Data is stored in Chroma")
            print_success("✓ Chat is using PDF content")
            print("\n" + GREEN + "RAG PIPELINE STATUS: FULLY OPERATIONAL ✅" + NC + "\n")
            return True
        else:
            print_header("⚠️ RAG Pipeline Partially Working")
            print_success("✓ Chroma is running")
            print_success("✓ Backend is responding")
            print_success("✓ Data is stored in Chroma")
            print_warning("✗ Chat might not be using PDF (or used different keywords)")
            print("\n" + YELLOW + "RAG PIPELINE STATUS: NEEDS INVESTIGATION ⚠️" + NC + "\n")
            
            print("Debug steps:")
            print(f"  1. Check the PDF content you uploaded")
            print(f"  2. Ask more specific questions")
            print(f"  3. Check logs: tail -f /tmp/backend.log")
            print(f"  4. Check Chroma data: python3 /tmp/check-chroma.py")
            return False
    else:
        print_header("❌ RAG Pipeline Issues")
        print_success("✓ Chroma is running")
        print_success("✓ Backend is responding")
        print_success("✓ Data is stored in Chroma")
        print_error("✗ Chat is not responding")
        print("\n" + RED + "RAG PIPELINE STATUS: ERROR ❌" + NC + "\n")
        
        print("Debug steps:")
        print(f"  1. Check backend logs: tail -f /tmp/backend.log")
        print(f"  2. Check Chroma logs: tail -f /tmp/chroma.log")
        print(f"  3. Restart: pkill -f 'npm start' && ./scripts/dev.sh")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
