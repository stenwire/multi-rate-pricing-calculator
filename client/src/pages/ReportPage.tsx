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
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Summary report
        </h1>
        <p className="mt-1 text-sm text-muted">
          Totals across finalized documents. Both dates are inclusive.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:p-5"
      >
        <div className="flex-1">
          <label className="field-label" htmlFor="startDate">
            Start date
          </label>
          <input
            id="startDate"
            type="date"
            required
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="field figure"
          />
        </div>

        <div className="flex-1">
          <label className="field-label" htmlFor="endDate">
            End date
          </label>
          <input
            id="endDate"
            type="date"
            required
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="field figure"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary sm:w-auto"
        >
          {loading ? 'Generating…' : 'Generate report'}
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-flag/20 bg-flag-soft px-4 py-3 text-sm text-flag"
        >
          {error}
        </p>
      )}

      {summary && <ReportSummary summary={summary} />}
    </div>
  );
}
