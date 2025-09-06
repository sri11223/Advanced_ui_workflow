#!/usr/bin/env python3
"""
Setup script for Advanced UI Workflow Backend
"""
import subprocess
import sys
import os

def install_dependencies():
    """Install required Python packages"""
    print("🔧 Installing dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependencies installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def check_environment():
    """Check if .env file exists and is configured"""
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if not os.path.exists(env_path):
        print("❌ .env file not found!")
        print("📝 Please create .env file with required configuration")
        return False
    
    print("✅ Environment file found")
    return True

def main():
    """Main setup function"""
    print("🚀 Advanced UI Workflow Backend Setup")
    print("=" * 50)
    
    if not check_environment():
        return False
    
    if not install_dependencies():
        return False
    
    print("\n🎉 Setup completed successfully!")
    print("📚 Start server with: python main.py")
    print("📖 API docs at: http://localhost:8000/docs")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
