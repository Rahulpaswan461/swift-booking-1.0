import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function CancelAppointment() {
    const { id, cancelToken } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
    const [message, setMessage] = useState('');

    const handleCancel = async () => {
        setStatus('loading');
        try {
            const { data } = await axios.patch(
                 `/api/appointments/${id}/cancel/${cancelToken}`
            );
            if (data.success) {
                setStatus('success');
                setMessage(data.message || 'Appointment cancelled successfully.');
            } else {
                setStatus('error');
                setMessage(data.message || 'Failed to cancel appointment.');
            }
        } catch (error) {
            console.error(error);
            setStatus('error');
            setMessage(error.response?.data?.message || 'An error occurred while canceling.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900 mb-2">
                        Cancel Appointment
                    </h2>
                </div>

                {status === 'idle' && (
                    <div className="text-center">
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to cancel your appointment? This action cannot be undone.
                        </p>
                        <div className="flex flex-col gap-4">
                            <button
                                onClick={handleCancel}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                            >
                                Yes, Cancel Appointment
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                            >
                                Keep Appointment
                            </button>
                        </div>
                    </div>
                )}

                {status === 'loading' && (
                    <div className="text-center text-gray-600 py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        Canceling your appointment...
                    </div>
                )}

                {status === 'success' && (
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-green-600 font-medium text-lg mb-6">{message}</p>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                        >
                            Return to Home
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <p className="text-red-500 font-medium mb-6">{message}</p>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                        >
                            Return to Home
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
