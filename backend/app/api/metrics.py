"""Metrics and monitoring API endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from app.utils.monitoring import metrics_collector, performance_tracker, system_monitor
from app.services.auth_service import get_current_user
from typing import Dict, Any

router = APIRouter(prefix="/metrics", tags=["metrics"])

@router.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": metrics_collector.metrics.get("timestamp", [])[-1].timestamp if metrics_collector.metrics.get("timestamp") else None
    }

@router.get("/performance")
async def get_performance_metrics(current_user: dict = Depends(get_current_user)):
    """Get application performance metrics"""
    return {
        "performance": performance_tracker.get_performance_stats(),
        "system": metrics_collector.get_metrics_summary()
    }

@router.get("/system")
async def get_system_metrics(current_user: dict = Depends(get_current_user)):
    """Get system resource metrics"""
    return metrics_collector.get_metrics_summary()

@router.get("/prometheus")
async def prometheus_metrics():
    """Prometheus-compatible metrics endpoint"""
    summary = metrics_collector.get_metrics_summary()
    
    # Convert to Prometheus format
    prometheus_output = []
    
    for metric_name, data in summary.items():
        if metric_name == "counters":
            continue
            
        if isinstance(data, dict) and "current" in data:
            prometheus_output.append(f"# TYPE {metric_name.replace('.', '_')} gauge")
            prometheus_output.append(f"{metric_name.replace('.', '_')} {data['current']}")
    
    # Add counters
    for counter_name, value in summary.get("counters", {}).items():
        clean_name = counter_name.split(":")[0].replace(".", "_")
        prometheus_output.append(f"# TYPE {clean_name} counter")
        prometheus_output.append(f"{clean_name} {value}")
    
    return "\n".join(prometheus_output)
