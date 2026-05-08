import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsAPI } from '../api';
import toast from 'react-hot-toast';

export default function ImportLeadsPage() {
  const [file, setFile]         = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef  = useRef();
  const navigate = useNavigate();
  const qc       = useQueryClient();

  const mutation = useMutation({
    mutationFn: (fd) => leadsAPI.import(fd),
    onSuccess: (res) => {
      toast.success(res.data.message);
      qc.invalidateQueries(['leads']);
      navigate('/leads');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Import failed'),
  });

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['xls', 'xlsx'].includes(ext)) return toast.error('Only .xls and .xlsx files allowed');
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = () => {
    if (!file) return toast.error('Please select a file');
    const fd = new FormData();
    fd.append('file', file);
    mutation.mutate(fd);
  };

  return (
    <div className="max-w-xl page-enter">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          ←
        </button>
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Import Leads</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Bulk import from Excel file</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Instructions */}
        <div className="card" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
          <p className="text-sm font-bold text-blue-800 mb-2">📋 Required Excel Format</p>
          <div className="grid grid-cols-2 gap-1">
            {[
              { col: 'Name', req: true },
              { col: 'Phone / Mobile', req: true },
              { col: 'Email', req: false },
              { col: 'City', req: false },
              { col: 'Product', req: false },
              { col: 'Budget', req: false },
              { col: 'Notes / Remarks', req: false },
              { col: 'Address', req: false },
            ].map(c => (
              <div key={c.col} className="flex items-center gap-1.5 text-xs text-blue-700">
                <span>{c.req ? '✅' : '⬜'}</span>
                <span className={c.req ? 'font-bold' : ''}>{c.col}</span>
                {c.req && <span className="text-blue-500">(required)</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Drop Zone */}
        <div
          className="card cursor-pointer transition-all"
          style={{
            border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border-input)'}`,
            backgroundColor: dragOver ? 'var(--accent-light)' : 'var(--bg-card)',
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current.click()}
        >
          <input ref={fileRef} type="file" accept=".xls,.xlsx" className="hidden"
            onChange={(e) => handleFile(e.target.files[0])} />

          <div className="text-center py-6">
            {file ? (
              <>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3"
                  style={{ backgroundColor: 'var(--accent-light)' }}>📊</div>
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                <button
                  className="text-xs mt-2 px-3 py-1 rounded-lg"
                  style={{ color: '#dc2626', backgroundColor: '#fef2f2' }}
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                  ✕ Remove
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3"
                  style={{ backgroundColor: 'var(--bg-card2)' }}>📥</div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Drop your Excel file here
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>or click to browse</p>
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>.xls, .xlsx — max 5MB</p>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button className="btn-primary flex-1 py-3" onClick={handleSubmit}
            disabled={!file || mutation.isPending}>
            {mutation.isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Importing...
              </span>
            ) : '📥 Import Leads'}
          </button>
          <button className="btn-secondary px-6" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
