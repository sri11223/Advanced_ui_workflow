"""Application monitoring and metrics collection"""
import time
import psutil
import asyncio
from typing import Dict, Any, List
from dataclasses import dataclass
from collections import defaultdict, deque
import json
import logging

logger = logging.getLogger(__name__)

@dataclass
class MetricPoint:
    """Single metric data point"""
    timestamp: float
    value: float
    tags: Dict[str, str] = None

class MetricsCollector:
    """Collect and store application metrics"""
    
    def __init__(self, max_points: int = 1000):
        self.max_points = max_points
        self.metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=max_points))
        self.counters: Dict[str, int] = defaultdict(int)
        
    def record_metric(self, name: str, value: float, tags: Dict[str, str] = None):
        """Record a metric value"""
        point = MetricPoint(
            timestamp=time.time(),
            value=value,
            tags=tags or {}
        )
        self.metrics[name].append(point)
    
    def increment_counter(self, name: str, tags: Dict[str, str] = None):
        """Increment a counter metric"""
        key = f"{name}:{json.dumps(tags or {}, sort_keys=True)}"
        self.counters[key] += 1
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get current metrics summary"""
        summary = {}
        
        for name, points in self.metrics.items():
            if points:
                values = [p.value for p in points]
                summary[name] = {
                    "current": values[-1],
                    "avg": sum(values) / len(values),
                    "min": min(values),
                    "max": max(values),
                    "count": len(values)
                }
        
        summary["counters"] = dict(self.counters)
        return summary

class SystemMonitor:
    """Monitor system resources"""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics = metrics_collector
        self.monitoring = False
    
    async def start_monitoring(self, interval: int = 30):
        """Start system monitoring"""
        self.monitoring = True
        
        while self.monitoring:
            try:
                # CPU usage
                cpu_percent = psutil.cpu_percent(interval=1)
                self.metrics.record_metric("system.cpu_percent", cpu_percent)
                
                # Memory usage
                memory = psutil.virtual_memory()
                self.metrics.record_metric("system.memory_percent", memory.percent)
                self.metrics.record_metric("system.memory_available_gb", memory.available / (1024**3))
                
                # Disk usage
                disk = psutil.disk_usage('/')
                self.metrics.record_metric("system.disk_percent", disk.percent)
                
                # Network I/O
                net_io = psutil.net_io_counters()
                self.metrics.record_metric("system.bytes_sent", net_io.bytes_sent)
                self.metrics.record_metric("system.bytes_recv", net_io.bytes_recv)
                
                await asyncio.sleep(interval)
                
            except Exception as e:
                logger.error(f"System monitoring error: {e}")
                await asyncio.sleep(interval)
    
    def stop_monitoring(self):
        """Stop system monitoring"""
        self.monitoring = False

class PerformanceTracker:
    """Track application performance"""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics = metrics_collector
        self.active_requests = 0
        self.request_times: deque = deque(maxlen=1000)
    
    def start_request(self) -> float:
        """Start tracking a request"""
        self.active_requests += 1
        self.metrics.record_metric("requests.active", self.active_requests)
        return time.time()
    
    def end_request(self, start_time: float, status_code: int = 200):
        """End tracking a request"""
        self.active_requests -= 1
        duration = time.time() - start_time
        
        self.request_times.append(duration)
        self.metrics.record_metric("requests.duration", duration)
        self.metrics.record_metric("requests.active", self.active_requests)
        self.metrics.increment_counter("requests.total", {"status": str(status_code)})
        
        # Alert on slow requests
        if duration > 2.0:
            logger.warning(f"Slow request detected: {duration:.2f}s")
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get current performance statistics"""
        if not self.request_times:
            return {"message": "No requests tracked yet"}
        
        times = list(self.request_times)
        return {
            "active_requests": self.active_requests,
            "avg_response_time": sum(times) / len(times),
            "min_response_time": min(times),
            "max_response_time": max(times),
            "p95_response_time": sorted(times)[int(len(times) * 0.95)],
            "total_requests": len(times)
        }

# Global instances
metrics_collector = MetricsCollector()
system_monitor = SystemMonitor(metrics_collector)
performance_tracker = PerformanceTracker(metrics_collector)
