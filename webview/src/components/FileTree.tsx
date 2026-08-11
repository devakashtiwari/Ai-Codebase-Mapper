import React from 'react';
import type { SnapshotPayload } from '../App';

type TreeNode = SnapshotPayload['folderTree'];

interface Props {
  tree?: TreeNode;
  onOpenFile: (path: string) => void;
}

export function FileTree({ tree, onOpenFile }: Props) {
  if (!tree) {
    return <div className="empty">No files scanned yet.</div>;
  }

  return (
    <div className="file-tree">
      {(tree.children || []).map(child => (
        <TreeItem key={child.path} node={child} depth={0} onOpenFile={onOpenFile} />
      ))}
    </div>
  );
}

function TreeItem({
  node,
  depth,
  onOpenFile
}: {
  node: TreeNode;
  depth: number;
  onOpenFile: (path: string) => void;
}) {
  const pad = { paddingLeft: depth * 14 };

  if (node.type === 'folder') {
    return (
      <>
        <div className="tree-folder" style={pad}>
          📁 {node.name}
        </div>
        {(node.children || []).map(c => (
          <TreeItem key={c.path} node={c} depth={depth + 1} onOpenFile={onOpenFile} />
        ))}
      </>
    );
  }

  return (
    <div
      className="tree-file"
      style={pad}
      onClick={() => onOpenFile(node.path)}
      title={node.path}
    >
      📄 {node.name}
    </div>
  );
}
