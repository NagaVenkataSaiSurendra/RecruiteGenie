import React, { useEffect, useRef } from 'react';

const AgenticMonitoring = () => {
  const latencyRef = useRef(null);
  const errorRef = useRef(null);
  let latencyChartInstance = useRef(null);
  let errorChartInstance = useRef(null);

  useEffect(() => {
    // Simulate dynamic data updates
    const updateMetrics = () => {
      const comparisonQueue = Math.max(1, Math.min(5, parseInt(document.getElementById('comparisonQueue').textContent) + Math.floor(Math.random() * 3) - 1));
      const rankingQueue = Math.max(0, Math.min(4, parseInt(document.getElementById('rankingQueue').textContent) + Math.floor(Math.random() * 3) - 1));
      const communicationQueue = Math.max(0, Math.min(3, parseInt(document.getElementById('communicationQueue').textContent) + Math.floor(Math.random() * 3) - 1));
      document.getElementById('comparisonQueue').textContent = comparisonQueue;
      document.getElementById('rankingQueue').textContent = rankingQueue;
      document.getElementById('communicationQueue').textContent = communicationQueue;
      document.getElementById('totalQueueItems').textContent = comparisonQueue + rankingQueue + communicationQueue;
      document.getElementById('comparisonLatency').textContent = Math.max(300, Math.min(600, 450 + Math.floor(Math.random() * 100) - 50));
      document.getElementById('rankingLatency').textContent = Math.max(250, Math.min(400, 320 + Math.floor(Math.random() * 100) - 50));
      document.getElementById('communicationLatency').textContent = Math.max(800, Math.min(1500, 1200 + Math.floor(Math.random() * 200) - 100));
      document.getElementById('comparisonErrors').textContent = (0.2 + (Math.random() * 0.2 - 0.1)).toFixed(1);
      document.getElementById('rankingErrors').textContent = (0.1 + (Math.random() * 0.1 - 0.05)).toFixed(1);
      document.getElementById('communicationErrors').textContent = (1.5 + (Math.random() * 0.5 - 0.25)).toFixed(1);
      const maxErrorRate = Math.max(
        parseFloat(document.getElementById('comparisonErrors').textContent),
        parseFloat(document.getElementById('rankingErrors').textContent),
        parseFloat(document.getElementById('communicationErrors').textContent)
      );
      let healthStatus = "Healthy";
      let healthClass = "text-green-600";
      if (maxErrorRate > 2) {
        healthStatus = "Degraded";
        healthClass = "text-yellow-600";
      } else if (maxErrorRate > 5) {
        healthStatus = "Critical";
        healthClass = "text-red-600";
      }
      const healthElement = document.getElementById('systemHealth');
      healthElement.textContent = healthStatus;
      healthElement.className = `text-2xl font-bold ${healthClass}`;
    };
    const interval = setInterval(updateMetrics, 5000);

    // Dynamically import Chart.js (use 'chart.js' for Vite compatibility)
    let isMounted = true;
    import('chart.js').then((Chart) => {
      if (!isMounted) return;
      if (latencyRef.current) {
        latencyChartInstance.current = new Chart.default(latencyRef.current, {
          type: 'line',
          data: {
            labels: ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00'],
            datasets: [{
              label: 'Latency (ms)',
              data: [450, 420, 480, 500, 460, 490, 470],
              borderColor: 'rgba(75, 192, 192, 1)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              borderWidth: 2,
              fill: true,
            }]
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                title: { display: true, text: 'Latency (ms)' }
              }
            }
          }
        });
      }
      if (errorRef.current) {
        errorChartInstance.current = new Chart.default(errorRef.current, {
          type: 'bar',
          data: {
            labels: ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00'],
            datasets: [{
              label: 'Error Rate (%)',
              data: [0.2, 0.3, 0.1, 0.4, 0.2, 0.5, 0.3],
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 1,
            }]
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                title: { display: true, text: 'Error Rate (%)' }
              }
            }
          }
        });
      }
    });
    return () => {
      isMounted = false;
      clearInterval(interval);
      if (latencyChartInstance.current) {
        latencyChartInstance.current.destroy();
      }
      if (errorChartInstance.current) {
        errorChartInstance.current.destroy();
      }
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Agentic Framework Monitoring</h1>
        <p className="text-gray-600">Real-time visibility into queues, latencies, and error rates</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Total Agents</p>
              <h3 className="text-2xl font-bold">3</h3>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <i className="fas fa-robot text-blue-600 text-xl"></i>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Total Queue Items</p>
              <h3 className="text-2xl font-bold" id="totalQueueItems">6</h3>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <i className="fas fa-tasks text-purple-600 text-xl"></i>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">System Health</p>
              <h3 className="text-2xl font-bold text-green-600" id="systemHealth">Healthy</h3>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <i className="fas fa-heartbeat text-green-600 text-xl"></i>
            </div>
          </div>
        </div>
      </div>
      {/* Agents Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Agent Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Comparison Agent */}
          <div className="agent-card bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-blue-600 p-4 text-white">
              <div className="flex justify-between items-center">
                <h3 className="font-bold">Comparison Agent</h3>
                <span className="health-indicator healthy"></span>
              </div>
              <p className="text-sm opacity-80">Analyzes JD and profiles</p>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Queue Size</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '30%' }}></div>
                </div>
                <p className="text-right text-sm mt-1"><span id="comparisonQueue">3</span> items</p>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Avg Latency</p>
                <p className="font-medium"><span id="comparisonLatency">450</span> ms</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Error Rate</p>
                <p className="font-medium"><span id="comparisonErrors">0.2</span>%</p>
              </div>
            </div>
          </div>
          {/* Ranking Agent */}
          <div className="agent-card bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-purple-600 p-4 text-white">
              <div className="flex justify-between items-center">
                <h3 className="font-bold">Ranking Agent</h3>
                <span className="health-indicator healthy"></span>
              </div>
              <p className="text-sm opacity-80">Ranks profiles by similarity</p>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Queue Size</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: '15%' }}></div>
                </div>
                <p className="text-right text-sm mt-1"><span id="rankingQueue">2</span> items</p>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Avg Latency</p>
                <p className="font-medium"><span id="rankingLatency">320</span> ms</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Error Rate</p>
                <p className="font-medium"><span id="rankingErrors">0.1</span>%</p>
              </div>
            </div>
          </div>
          {/* Communication Agent */}
          <div className="agent-card bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-green-600 p-4 text-white">
              <div className="flex justify-between items-center">
                <h3 className="font-bold">Communication Agent</h3>
                <span className="health-indicator healthy"></span>
              </div>
              <p className="text-sm opacity-80">Sends notifications</p>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Queue Size</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '5%' }}></div>
                </div>
                <p className="text-right text-sm mt-1"><span id="communicationQueue">1</span> items</p>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Avg Latency</p>
                <p className="font-medium"><span id="communicationLatency">1200</span> ms</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Error Rate</p>
                <p className="font-medium"><span id="communicationErrors">1.5</span>%</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Detailed Metrics Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Detailed Metrics</h2>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Latency Chart */}
            <div>
              <h3 className="font-medium mb-4 text-gray-700">Latency Trends (ms)</h3>
              <canvas ref={latencyRef} height="250"></canvas>
            </div>
            {/* Error Rate Chart */}
            <div>
              <h3 className="font-medium mb-4 text-gray-700">Error Rate Trends (%)</h3>
              <canvas ref={errorRef} height="250"></canvas>
            </div>
          </div>
        </div>
      </section>
      {/* Queue Details Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Queue Details</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Queue Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oldest Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processing Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <i className="fas fa-exchange-alt text-blue-600"></i>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">Comparison Agent</div>
                        <div className="text-sm text-gray-500">JD analysis</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">3 items</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">2 min ago</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">~15 items/min</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <i className="fas fa-sort-amount-up text-purple-600"></i>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">Ranking Agent</div>
                        <div className="text-sm text-gray-500">Profile ranking</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">2 items</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">1 min ago</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">~20 items/min</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                        <i className="fas fa-paper-plane text-green-600"></i>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">Communication Agent</div>
                        <div className="text-sm text-gray-500">Notifications</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">1 item</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">30 sec ago</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">~8 items/min</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <style>{`
        .agent-card { transition: all 0.3s ease; }
        .agent-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        .queue-item { animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }
        .health-indicator { width: 12px; height: 12px; border-radius: 50%; display: inline-block; margin-right: 5px; }
        .healthy { background-color: #10B981; }
        .warning { background-color: #F59E0B; }
        .critical { background-color: #EF4444; }
      `}</style>
    </div>
  );
};

export default AgenticMonitoring; 