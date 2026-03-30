import React, { useState } from 'react';
import {
  Users, Calendar, Clock, TrendingUp
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

const EarningsSection = ({
  calculateEarnings,
  getDailyEarningsData,
  getMonthlyEarningsData,
  getYearlyEarningsData
}) => {
  const [view, setView] = useState('month'); // Options: 'day', 'month', 'year'

  const { totalPatients, weekEarnings, monthEarnings, yearEarnings } = calculateEarnings();

  const earningsCards = [
    { label: 'Total Patients', value: totalPatients, icon: Users, bg: 'primary' },
    { label: 'This Week', value: `₹${weekEarnings}`, icon: Calendar, bg: 'success' },
    { label: 'This Month', value: `₹${monthEarnings}`, icon: Clock, bg: 'warning' },
    { label: 'This Year', value: `₹${yearEarnings}`, icon: TrendingUp, bg: 'info' },
  ];

  // Get correct chart data based on selected view
  const getData = () => {
    if (view === 'day') return getDailyEarningsData();
    if (view === 'year') return getYearlyEarningsData();
    return getMonthlyEarningsData();
  };

  const chartData = getData();
  const xKey = view === 'day' ? 'date' : view === 'month' ? 'month' : 'year';

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white border-bottom">
        <h5 className="mb-0 fw-semibold">My Earnings</h5>
      </div>

      <div className="card-body">
        {/* Top Stats */}
        <div className="row g-4 mb-4">
          {earningsCards.map((item, index) => (
            <div className="col-md-6 col-xl-3" key={index}>
              <div className={`d-flex align-items-center p-3 rounded shadow-sm bg-${item.bg} bg-opacity-10`}>
                <div
                  className={`rounded-circle d-flex align-items-center justify-content-center bg-${item.bg} text-white me-3`}
                  style={{ width: '45px', height: '45px' }}
                >
                  <item.icon size={22} />
                </div>
                <div>
                  <small className="text-muted">{item.label}</small>
                  <h5 className="mb-0 fw-bold">{item.value}</h5>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chart Title + View Selector */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="fw-semibold mb-0">Earnings Overview</h6>
          <select
            className="form-select w-auto"
            value={view}
            onChange={(e) => setView(e.target.value)}
          >
            <option value="day">Daily</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </div>

        {/* Line Chart */}
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="earnings" stroke="#0d6efd" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-3 text-center text-muted">
          <small>Note: Earnings are based on ₹500 per consultation.</small>
        </div>
      </div>
    </div>
  );
};

export default EarningsSection;
