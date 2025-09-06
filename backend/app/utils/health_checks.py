"""Comprehensive health check utilities"""
import asyncio
import time
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum
import psutil
import aiohttp
from app.core.database import db
from app.core.redis_client import redis_client

class HealthStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"

@dataclass
class HealthCheck:
    name: str
    status: HealthStatus
    response_time: float
    message: str
    details: Dict[str, Any] = None

class HealthChecker:
    """Comprehensive health checking system"""
    
    def __init__(self):
        self.checks: Dict[str, callable] = {
            "database": self._check_database,
            "redis": self._check_redis,
            "memory": self._check_memory,
            "disk": self._check_disk,
            "cpu": self._check_cpu,
        }
    
    async def run_all_checks(self) -> Dict[str, Any]:
        """Run all health checks"""
        results = {}
        overall_status = HealthStatus.HEALTHY
        
        for name, check_func in self.checks.items():
            try:
                start_time = time.time()
                check_result = await check_func()
                response_time = time.time() - start_time
                
                results[name] = {
                    "status": check_result.status.value,
                    "response_time": round(response_time, 3),
                    "message": check_result.message,
                    "details": check_result.details or {}
                }
                
                # Update overall status
                if check_result.status == HealthStatus.UNHEALTHY:
                    overall_status = HealthStatus.UNHEALTHY
                elif check_result.status == HealthStatus.DEGRADED and overall_status == HealthStatus.HEALTHY:
                    overall_status = HealthStatus.DEGRADED
                    
            except Exception as e:
                results[name] = {
                    "status": HealthStatus.UNHEALTHY.value,
                    "response_time": 0,
                    "message": f"Health check failed: {str(e)}",
                    "details": {}
                }
                overall_status = HealthStatus.UNHEALTHY
        
        return {
            "status": overall_status.value,
            "timestamp": time.time(),
            "checks": results,
            "summary": self._generate_summary(results)
        }
    
    async def _check_database(self) -> HealthCheck:
        """Check database connectivity and performance"""
        try:
            # Test basic connectivity
            start_time = time.time()
            test_result = await db.get_user("test-health-check")
            response_time = time.time() - start_time
            
            if response_time > 2.0:
                return HealthCheck(
                    name="database",
                    status=HealthStatus.DEGRADED,
                    response_time=response_time,
                    message="Database responding slowly",
                    details={"response_time": response_time}
                )
            
            return HealthCheck(
                name="database",
                status=HealthStatus.HEALTHY,
                response_time=response_time,
                message="Database connection healthy",
                details={"response_time": response_time}
            )
            
        except Exception as e:
            return HealthCheck(
                name="database",
                status=HealthStatus.UNHEALTHY,
                response_time=0,
                message=f"Database connection failed: {str(e)}"
            )
    
    async def _check_redis(self) -> HealthCheck:
        """Check Redis connectivity"""
        try:
            start_time = time.time()
            connected = await redis_client.connect()
            response_time = time.time() - start_time
            
            if not connected:
                return HealthCheck(
                    name="redis",
                    status=HealthStatus.DEGRADED,
                    response_time=response_time,
                    message="Redis not available, using memory fallback"
                )
            
            return HealthCheck(
                name="redis",
                status=HealthStatus.HEALTHY,
                response_time=response_time,
                message="Redis connection healthy"
            )
            
        except Exception as e:
            return HealthCheck(
                name="redis",
                status=HealthStatus.DEGRADED,
                response_time=0,
                message=f"Redis check failed: {str(e)}"
            )
    
    async def _check_memory(self) -> HealthCheck:
        """Check system memory usage"""
        try:
            memory = psutil.virtual_memory()
            
            if memory.percent > 90:
                status = HealthStatus.UNHEALTHY
                message = "Critical memory usage"
            elif memory.percent > 80:
                status = HealthStatus.DEGRADED
                message = "High memory usage"
            else:
                status = HealthStatus.HEALTHY
                message = "Memory usage normal"
            
            return HealthCheck(
                name="memory",
                status=status,
                response_time=0,
                message=message,
                details={
                    "percent": memory.percent,
                    "available_gb": round(memory.available / (1024**3), 2),
                    "total_gb": round(memory.total / (1024**3), 2)
                }
            )
            
        except Exception as e:
            return HealthCheck(
                name="memory",
                status=HealthStatus.UNHEALTHY,
                response_time=0,
                message=f"Memory check failed: {str(e)}"
            )
    
    async def _check_disk(self) -> HealthCheck:
        """Check disk usage"""
        try:
            disk = psutil.disk_usage('/')
            
            if disk.percent > 95:
                status = HealthStatus.UNHEALTHY
                message = "Critical disk usage"
            elif disk.percent > 85:
                status = HealthStatus.DEGRADED
                message = "High disk usage"
            else:
                status = HealthStatus.HEALTHY
                message = "Disk usage normal"
            
            return HealthCheck(
                name="disk",
                status=status,
                response_time=0,
                message=message,
                details={
                    "percent": disk.percent,
                    "free_gb": round(disk.free / (1024**3), 2),
                    "total_gb": round(disk.total / (1024**3), 2)
                }
            )
            
        except Exception as e:
            return HealthCheck(
                name="disk",
                status=HealthStatus.UNHEALTHY,
                response_time=0,
                message=f"Disk check failed: {str(e)}"
            )
    
    async def _check_cpu(self) -> HealthCheck:
        """Check CPU usage"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            
            if cpu_percent > 95:
                status = HealthStatus.UNHEALTHY
                message = "Critical CPU usage"
            elif cpu_percent > 80:
                status = HealthStatus.DEGRADED
                message = "High CPU usage"
            else:
                status = HealthStatus.HEALTHY
                message = "CPU usage normal"
            
            return HealthCheck(
                name="cpu",
                status=status,
                response_time=0,
                message=message,
                details={
                    "percent": cpu_percent,
                    "cores": psutil.cpu_count()
                }
            )
            
        except Exception as e:
            return HealthCheck(
                name="cpu",
                status=HealthStatus.UNHEALTHY,
                response_time=0,
                message=f"CPU check failed: {str(e)}"
            )
    
    def _generate_summary(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate health check summary"""
        healthy_count = sum(1 for r in results.values() if r["status"] == "healthy")
        degraded_count = sum(1 for r in results.values() if r["status"] == "degraded")
        unhealthy_count = sum(1 for r in results.values() if r["status"] == "unhealthy")
        
        return {
            "total_checks": len(results),
            "healthy": healthy_count,
            "degraded": degraded_count,
            "unhealthy": unhealthy_count,
            "success_rate": round((healthy_count / len(results)) * 100, 1)
        }

# Global health checker instance
health_checker = HealthChecker()
