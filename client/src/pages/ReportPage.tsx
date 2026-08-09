import { FormEvent, useState } from 'react';
import {
  ReportSummary as Summary,
  apiErrorMessage,
  reportsApi,
} from '../api/client';
import ReportSummary from '../components/ReportSummary';

export default function ReportPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await reportsApi.summary(startDate, endDate);
      setSummary(result.summary);
    } catch (caught) {
      setSummary(null);
      setError(apiErrorMessage(caught, 'Unable to generate the report.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Summary report</h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-3 rounded border border-slate-200 bg-white p-6"
      >
        <label className="text-sm">
          <span className="mb-1 block font-medium">Start date</span>
          <input
            type="date"
            required
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium">End date</span>
          <input
            type="date"
            required
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate report'}
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="rounded bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {summary && <ReportSummary summary={summary} />}
    </div>
  );
}
