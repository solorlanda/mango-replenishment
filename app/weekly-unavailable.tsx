'use client';

import {useEffect, useState} from 'react';

type Record = {
  id: string;
  name: string;
  color: string;
  size: string;
  shift: string;
  archived: number;
};

export default function WeeklyUnavailable({updatedAt}: {updatedAt: string}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Record[] | null>(null);
  const [query, setQuery] = useState('');
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch('/api/items?view=weekly-unavailable', {signal: controller.signal})
      .then(response => {
        if (!response.ok) throw new Error('Unable to load sizes');
        return response.json();
      })
      .then(records => {
        if (controller.signal.aborted) return;
        setRows(records);
        setFailed(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [open, attempt, updatedAt]);

  const terms = query.trim().toLocaleLowerCase('en').split(/\s+/).filter(Boolean);
  const visible = rows?.filter(row => {
    const text = [row.name, row.color, row.size].join(' ').toLocaleLowerCase('en');
    return terms.every(term => text.includes(term));
  });

  return (
    <details className="weekly-unavailable" onToggle={event => setOpen(event.currentTarget.open)}>
      <summary>Unavailable · Last 7 days</summary>
      {open && <>
        <label>Search by product, colour or size
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="E.g. black jumper M"/>
        </label>
        {failed ? <p role="alert">Unable to load results. <button className="text-button" onClick={() => {
          setFailed(false);
          setAttempt(value => value + 1);
        }}>Try again</button></p> : visible === undefined ? <p role="status">Loading unavailable sizes…</p> :
          visible.length === 0 ? <p role="status">{terms.length ? 'No matching sizes.' : 'No unavailable sizes in the last 7 days.'}</p> :
          <ul>{visible.map(row => {
            const [date, turn] = row.shift.split(' · ');
            return <li key={row.id}>
              <strong>{row.name}</strong> · {row.color} · {row.size}
              <small>{date} · {turn === 'Mañana' ? 'Morning' : 'Afternoon'}{row.archived ? ' · Archived' : ''}</small>
            </li>;
          })}</ul>}
      </>}
    </details>
  );
}
