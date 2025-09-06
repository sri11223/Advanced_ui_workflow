import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def test_supabase_connection():
    """Test Supabase connection with current keys"""
    try:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_ANON_KEY")
        
        print(f"Testing connection to: {url}")
        print(f"Using key: {key[:50]}...")
        
        # Create client
        supabase = create_client(url, key)
        
        # Test query
        result = supabase.table('users').select('*').limit(1).execute()
        print("✅ Supabase connection successful!")
        print(f"Query result: {result}")
        return True
        
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        return False

if __name__ == "__main__":
    test_supabase_connection()
