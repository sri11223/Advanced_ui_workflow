from fastapi import APIRouter
from app.utils.health_checks import health_checker
from app.utils.monitoring import metrics_collector, performance_tracker

router = APIRouter(prefix="/health", tags=["health"])

@router.get("/")
async def health_check():
    """Comprehensive health check endpoint"""
    return await health_checker.run_all_checks()

@router.get("/quick")
async def quick_health_check():
    """Quick health check for load balancers"""
    return {
        "status": "healthy",
        "timestamp": metrics_collector.metrics.get("timestamp", [])[-1].timestamp if metrics_collector.metrics.get("timestamp") else None
    }

@router.get("/detailed")
async def detailed_health_check():
    """Detailed health information including metrics"""
    health_data = await health_checker.run_all_checks()
    
    return {
        **health_data,
        "performance": performance_tracker.get_performance_stats(),
        "metrics_summary": metrics_collector.get_metrics_summary()
    }
