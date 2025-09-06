from supabase import create_client, Client
from .config import settings
import asyncio

class SupabaseClient:
    def __init__(self):
        self.client: Client = None
        self._initialized = False
    
    def _initialize_client(self):
        """Lazy initialization of Supabase client"""
        if not self._initialized:
            try:
                if settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY:
                    self.client = create_client(
                        settings.SUPABASE_URL,
                        settings.SUPABASE_ANON_KEY
                    )
                    self._initialized = True
                    return True
                else:
                    print("❌ Supabase URL or API key not configured")
                    return False
            except Exception as e:
                print(f"❌ Supabase client initialization failed: {e}")
                return False
        return True
    
    async def test_connection(self):
        """Test Supabase connection using the client"""
        try:
            if not self._initialize_client():
                return False
            
            # Test with a simple query
            result = self.client.table('users').select('id').limit(1).execute()
            print("✅ Supabase connection successful!")
            return True
        except Exception as e:
            print(f"❌ Supabase connection failed: {e}")
            return False
    
    def get_client(self) -> Client:
        if not self._initialize_client():
            return None
        return self.client

# Global Supabase client instance
supabase_client = SupabaseClient()
