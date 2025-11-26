import React, { useEffect, useState } from 'react';

function DeliveryCard({ d, onApprove, onReject }) {
  return (
    <div className="bg-white rounded shadow p-4 mb-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">{d.title || `Delivery ${d.deliveryNumber}`}</h3>
          <p className="text-sm text-gray-600">Project: {d.projectId}</p>
          <p className="text-sm text-gray-600">Submitted: {d.submittedAt ? new Date(d.submittedAt).toLocaleString() : '-'}</p>
        </div>
        <div className="space-x-2">
          <button onClick={() => onApprove(d._id)} className="bg-green-500 text-white px-3 py-1 rounded">Approve</button>
          <button onClick={() => onReject(d._id)} className="bg-red-500 text-white px-3 py-1 rounded">Reject</button>
        </div>
      </div>
      {d.reviewComments && <p className="mt-2 text-sm text-gray-700">Comments: {d.reviewComments}</p>}
    </div>
  );
}

export default function ReviewerDashboard() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await window.electronAPI.getPendingDeliveries();
      if (res && res.success && res.deliveries) {
        setDeliveries(res.deliveries);
      } else if (res && res.deliveries) {
        setDeliveries(res.deliveries);
      } else {
        setDeliveries([]);
      }
    } catch (err) {
      console.error('Failed to load pending deliveries', err);
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleApprove = async (deliveryId) => {
    try {
      const reviewerId = null; // TODO: use currentUser id when available
      const res = await window.electronAPI.reviewDelivery(deliveryId, reviewerId, 'approve', 'Approved via dashboard');
      if (res && res.success) loadPending();
      else console.error('Approve failed', res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (deliveryId) => {
    try {
      const reviewerId = null; // TODO: use currentUser id when available
      const res = await window.electronAPI.reviewDelivery(deliveryId, reviewerId, 'reject', 'Rejected via dashboard');
      if (res && res.success) loadPending();
      else console.error('Reject failed', res);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Reviewer Dashboard</h1>
      <p className="text-sm text-gray-600 mb-4">Pending deliveries assigned to you (or system-wide for MVP).</p>

      {loading ? (
        <div>Loading...</div>
      ) : deliveries.length === 0 ? (
        <div className="text-gray-600">No pending deliveries found.</div>
      ) : (
        <div>
          {deliveries.map(d => (
            <DeliveryCard key={d._id} d={d} onApprove={handleApprove} onReject={handleReject} />
          ))}
        </div>
      )}
    </div>
  );
}
