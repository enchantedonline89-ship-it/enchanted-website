'use client'
import { AdminLog } from '@/types'
import { formatDate } from '@/lib/utils'

interface Props { logs: AdminLog[] }

const actionColors = {
  CREATE: 'text-green-400 bg-green-400/10',
  UPDATE: 'text-blue-400 bg-blue-400/10',
  DELETE: 'text-red-400 bg-red-400/10',
}

export default function AuditLogTable({ logs }: Props) {
  if (logs.length === 0) {
    return <p className="text-muted text-sm text-center py-8">No activity yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-muted text-xs uppercase tracking-wider pb-3 pr-4">Action</th>
            <th className="text-left text-muted text-xs uppercase tracking-wider pb-3 pr-4">Item</th>
            <th className="text-left text-muted text-xs uppercase tracking-wider pb-3 pr-4">Type</th>
            <th className="text-left text-muted text-xs uppercase tracking-wider pb-3 pr-4">Admin</th>
            <th className="text-left text-muted text-xs uppercase tracking-wider pb-3">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {logs.map(log => (
            <tr key={log.id} className="hover:bg-foreground/[0.02] transition-colors">
              <td className="py-3 pr-4">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actionColors[log.action]}`}>
                  {log.action}
                </span>
              </td>
              <td className="py-3 pr-4 text-foreground font-medium">{log.entity_name || '—'}</td>
              <td className="py-3 pr-4 text-muted capitalize">{log.entity_type}</td>
              <td className="py-3 pr-4 text-muted text-xs truncate max-w-[160px]">{log.admin_email}</td>
              <td className="py-3 text-muted text-xs">{formatDate(log.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
