import React from 'react';
import type { SnapshotPayload } from '../App';

interface Props {
  snapshot: SnapshotPayload | null;
  onOpenFile: (path: string) => void;
}

export function DependenciesView({ snapshot, onOpenFile }: Props) {
  if (!snapshot) {
    return <div className="empty">No data yet.</div>;
  }

  const internal = (snapshot.dependencies || []).filter(d => !d.isExternal);
  const external = (snapshot.dependencies || []).filter(d => d.isExternal);

  return (
    <div className="deps-list">
      <h3 style={{ marginTop: 0 }}>Internal ({internal.length})</h3>
      {internal.length === 0 && <div className="empty">No internal dependencies detected.</div>}
      {internal.slice(0, 200).map((d, i) => (
        <div
          key={i}
          className="edge"
          onClick={() => onOpenFile(d.source)}
          title="Click to open source"
        >
          {d.source} → {d.target}
        </div>
      ))}
      <h3>External packages ({new Set(external.map(d => d.target)).size})</h3>
      {[...new Set(external.map(d => d.target))]
        .slice(0, 50)
        .map(pkg => (
          <div key={pkg} className="edge">
            {pkg}
          </div>
        ))}
    </div>
  );
}
