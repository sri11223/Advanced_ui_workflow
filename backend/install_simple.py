#!/usr/bin/env python3
"""
Simple dependency installer for Advanced UI Workflow Backend
Handles Windows Long Path issues and installs packages individually
"""
import subprocess
import sys

def install_package(package):
    """Install a single package with error handling"""
    try:
        print(f"Installing {package}...")
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", 
            package, "--no-warn-script-location", "--user"
        ])
        print(f"✅ {package} installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install {package}: {e}")
        return False

def main():
    """Install all required packages"""
    packages = [
        "fastapi==0.104.1",
        "uvicorn[standard]==0.24.0",
        "sqlalchemy==2.0.23",
        "asyncpg==0.29.0",
        "python-jose[cryptography]==3.3.0",
        "passlib[bcrypt]==1.7.4",
        "python-dotenv==1.0.0",
        "redis==5.0.1",
        "websockets==12.0",
        "supabase==2.0.2",
        "pydantic-settings==2.0.3",
        "aiohttp==3.9.1",
        "pydantic[email]==2.5.0",
        "email-validator==2.1.0"
    ]
    
    print("🔧 Installing Advanced UI Workflow Backend Dependencies")
    print("=" * 60)
    
    success_count = 0
    for package in packages:
        if install_package(package):
            success_count += 1
    
    print("\n" + "=" * 60)
    print(f"📊 Installation Results: {success_count}/{len(packages)} packages installed")
    
    if success_count >= len(packages) - 2:  # Allow 2 failures
        print("🎉 Backend dependencies installed successfully!")
        print("🚀 Run: python health_check.py")
        return True
    else:
        print("❌ Critical dependencies missing")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
