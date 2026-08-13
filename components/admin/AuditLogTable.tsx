'use client'
import { AdminLog } from '@/types'
import { formatDate } from '@/lib/utils'

interface Props { logs: AdminLog[] }

const actionColors = {
  CREATE: 'text-signal-ok bg-signal-ok/10',
  UPDATE: 'text-ink bg-ink/10',
  DELETE: 'text-signal-error bg-signal-error/10',
}

export default function AuditLogTable({ logs }: Props) {
  if (logs.length === 0) {
    return <p className="text-ink-dim text-sm text-center py-8">No activity yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line">
            <th className="text-left text-ink-dim text-xs uppercase tracking-wider pb-3 pr-4">Action</th>
            <th className="text-left text-ink-dim text-xs uppercase tracking-wider pb-3 pr-4">Item</th>
            <th className="text-left text-ink-dim text-xs uppercase tracking-wider pb-3 pr-4">Type</th>
            <th className="text-left text-ink-dim text-xs uppercase tracking-wider pb-3 pr-4">Admin</th>
            <th className="text-left text-ink-dim text-xs uppercase tracking-wider pb-3">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {logs.map(log => (
            <tr key={log.id} className="hover:bg-ink/[0.04] transition-colors">
              <td className="py-3 pr-4">
                <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${actionColors[log.action]}`}>
                  {log.action}
                </span>
              </td>
              <td className="py-3 pr-4 text-ink font-medium">{log.entity_name || ' - '}</td>
              <td className="py-3 pr-4 text-ink-dim capitalize">{log.entity_type}</td>
              <td className="py-3 pr-4 text-ink-dim text-xs truncate max-w-[160px]">{log.admin_email}</td>
              <td className="py-3 text-ink-dim text-xs">{formatDate(log.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
