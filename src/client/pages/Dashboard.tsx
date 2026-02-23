import React, { useEffect, useState } from "react";
import { Package, FileCheck, AlertCircle, Activity, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Stats {
  totalProducts: number;
  draftProducts: number;
  errorProducts: number;
  totalLogs: number;
  errorLogs: number;
}

interface Product {
  id: number;
  filename: string;
  title: string;
  status: string;
  created_at: string;
}

interface Log {
  id: number;
  action: string;
  status: string;
  message: string;
  created_at: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [recentLogs, setRecentLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [statsRes, productsRes, logsRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/products?limit=5"),
        fetch("/api/logs?limit=10"),
      ]);

      setStats(await statsRes.json());
      const productsData = await productsRes.json();
      setRecentProducts(productsData.data);
      const logsData = await logsRes.json();
      setRecentLogs(logsData.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Products",
      value: stats?.totalProducts || 0,
      icon: Package,
      color: "text-gray-900",
      bg: "bg-gray-50",
    },
    {
      label: "Draft Products",
      value: stats?.draftProducts || 0,
      icon: FileCheck,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Total Logs",
      value: stats?.totalLogs || 0,
      icon: Activity,
      color: "text-gray-600",
      bg: "bg-gray-50",
    },
    {
      label: "Error Logs",
      value: stats?.errorLogs || 0,
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600">Printify product automation overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <stat.icon className="w-4 h-4" />
              {stat.label}
            </div>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Products */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Products</h3>
            <Link
              to="/products"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentProducts.length === 0 ? (
              <p className="p-6 text-gray-500 text-center">No products yet</p>
            ) : (
              recentProducts.map((product) => (
                <div key={product.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {product.title || product.filename}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(product.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      product.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : product.status === "error"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {product.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Logs */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {recentLogs.length === 0 ? (
              <p className="p-6 text-gray-500 text-center">No activity yet</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        log.status === "success"
                          ? "bg-green-500"
                          : log.status === "error"
                          ? "bg-red-500"
                          : "bg-blue-500"
                      }`}
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {log.action}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 truncate">
                    {log.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
