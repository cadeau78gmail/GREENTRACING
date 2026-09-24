const STATUS_COLOR = {
  active: 'var(--color-success)',
  alert: 'var(--color-accent)',
  'low-battery': '#f59e0b',
  offline: '#94a3b8'
}

const MIN_NODE_DISTANCE = 12

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

function positionNodes(nodes) {
  return nodes.reduce((positionedNodes, node, index) => {
    let displayX = Number(node.x)
    let displayY = Number(node.y)
    let attempt = 0

    while (
      positionedNodes.some((positionedNode) => {
        const distance = Math.hypot(displayX - positionedNode.displayX, displayY - positionedNode.displayY)
        return distance < MIN_NODE_DISTANCE
      }) &&
      attempt < 8
    ) {
      const angle = index * 1.7 + attempt * (Math.PI / 3)
      const spread = 8 + attempt * 2
      displayX = clamp(Number(node.x) + Math.cos(angle) * spread, 5, 95)
      displayY = clamp(Number(node.y) + Math.sin(angle) * spread, 8, 88)
      attempt += 1
    }

    positionedNodes.push({ ...node, displayX, displayY })
    return positionedNodes
  }, [])
}

export default function SatelliteMap({ nodes, coverage, scanLabel, height = 'h-72' }) {
  const visibleNodes = positionNodes(nodes || [])

  return (
    <div className={`relative w-full ${height} rounded-lg overflow-hidden bg-[var(--map-bg)]`}>
      {/* stylized earth curvature */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 130%, var(--map-horizon) 0%, var(--map-depth) 35%, var(--map-bg) 65%, var(--map-bg) 100%)'
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            'radial-gradient(80% 100% at 50% 100%, var(--map-land) 0%, rgba(184, 148, 90, 0.06) 45%, transparent 75%)'
        }}
      />
      {/* stars */}
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: 'radial-gradient(1px 1px at 20px 30px, white, transparent), radial-gradient(1px 1px at 90px 80px, white, transparent), radial-gradient(1px 1px at 150px 20px, white, transparent), radial-gradient(1px 1px at 210px 100px, white, transparent), radial-gradient(1px 1px at 280px 50px, white, transparent)',
        backgroundSize: '300px 150px'
      }} />
      {/* grid */}
      <div className="absolute inset-0 opacity-[0.07]" style={{
        backgroundImage: 'linear-gradient(var(--map-grid) 1px, transparent 1px), linear-gradient(90deg, var(--map-grid) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      {visibleNodes.map((node) => (
        <div
          key={node.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${node.displayX}%`, top: `${node.displayY}%` }}
        >
          {node.status === 'alert' && (
            <span
              className="absolute inset-0 -m-3 rounded-full animate-ping"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.3)' }}
            />
          )}
          <span
            className="block w-2.5 h-2.5 rounded-full ring-2 ring-black/40"
            style={{ backgroundColor: node.status === 'alert' ? '#ef4444' : STATUS_COLOR[node.status] }}
          />
          <span
            className={`absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide border bg-black/75 ${
              node.status === 'alert'
                ? 'text-red-300 border-red-500/60'
                : node.status === 'offline'
                  ? 'text-slate-300 border-slate-500/60'
                  : node.status === 'low-battery'
                    ? 'text-amber-300 border-amber-500/60'
                  : 'text-emerald-300 border-emerald-500/50'
            }`}
          >
            {node.id}
          </span>
        </div>
      ))}

      {coverage && (
        <div className="absolute left-4 bottom-4 bg-black/50 backdrop-blur rounded-md px-3 py-1.5 text-xs font-mono text-slate-300">
          COVERAGE: <span className="text-slate-50 font-semibold">{coverage}</span>
        </div>
      )}
      {scanLabel && (
        <div className="absolute right-4 bottom-4 bg-black/50 backdrop-blur rounded-md px-3 py-1.5 text-xs font-mono text-slate-300">
          SCAN: <span className="text-moss-400 font-semibold">{scanLabel}</span>
        </div>
      )}
    </div>
  )
}
