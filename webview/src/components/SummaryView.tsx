import React from 'react';
import type { SnapshotPayload } from '../App';

interface Props {
  analysis?: SnapshotPayload['analysis'];
}

export function SummaryView({ analysis }: Props) {
  if (!analysis) {
    return <div className="empty">No AI analysis available yet.</div>;
  }

  return (
    <div className="summary-panel">
      <h2>{analysis.projectName}</h2>
      <p>
        <strong>Type:</strong> {analysis.projectType}
      </p>
      <p>
        <strong>Technologies:</strong> {(analysis.technologies || []).join(', ') || '—'}
      </p>
      {analysis.summary && (
        <>
          <h2>Summary</h2>
          <p>{analysis.summary}</p>
        </>
      )}
      {analysis.modules && analysis.modules.length > 0 && (
        <>
          <h2>Modules</h2>
          <ul>
            {analysis.modules.map(m => (
              <li key={m.name}>
                <strong>{m.name}</strong> ({m.path}) — {m.purpose}
              </li>
            ))}
          </ul>
        </>
      )}
      {analysis.entryPoints && analysis.entryPoints.length > 0 && (
        <>
          <h2>Entry points</h2>
          <ul>
            {analysis.entryPoints.map(e => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </>
      )}
      {analysis.importantFiles && analysis.importantFiles.length > 0 && (
        <>
          <h2>Important files</h2>
          <ul>
            {analysis.importantFiles.map(f => (
              <li key={f.path}>
                {f.path} — {f.reason}
              </li>
            ))}
          </ul>
        </>
      )}
      {analysis.dataFlow && (
        <>
          <h2>Data flow</h2>
          <p>{analysis.dataFlow}</p>
        </>
      )}
      {analysis.authenticationFlow && (
        <>
          <h2>Authentication</h2>
          <p>{analysis.authenticationFlow}</p>
        </>
      )}
      {analysis.circularDependencies && analysis.circularDependencies.length > 0 && (
        <>
          <h2>Circular dependencies</h2>
          <ul>
            {analysis.circularDependencies.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </>
      )}
      {analysis.potentialProblems && analysis.potentialProblems.length > 0 && (
        <>
          <h2>Potential problems</h2>
          <ul>
            {analysis.potentialProblems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </>
      )}
      {analysis.suggestedImprovements && analysis.suggestedImprovements.length > 0 && (
        <>
          <h2>Suggested improvements</h2>
          <ul>
            {analysis.suggestedImprovements.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
