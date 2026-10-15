import React, { useState } from 'react';
import { IngestedReading } from '../../types';
import { formatTimestamp, formatGpsCoordinate } from '../../utils/formatters';
import { 
  Database, 
  Download, 
  Search, 
  Calendar,
  Layers,
  LineChart
} from 'lucide-react';
import { HistoricalCharts } from '../../components/charts/HistoricalCharts';

interface HistoricalDataTabProps {
  historicalData: IngestedReading[];
  isDemoMode?: boolean;
}

export const HistoricalDataTab: React.FC<HistoricalDataTabProps> = ({ 
  historicalData,
  isDemoMode = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [timeWindowHours, setTimeWindowHours] = useState<number>(24);
  const itemsPerPage = 15;

  const filtered = historicalData.filter((item) => {
    if (!searchTerm) return true;
    return (
      item.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formatTimestamp(item.timestamp).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const currentItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExportCsv = () => {
    if (historicalData.length === 0) return;

    const headers = [
      'Timestamp_ISO',
      'Device_ID',
      'Source',
      'Recorded_By',
      'PM1_0_ug_m3',
      'PM2_5_ug_m3',
      'PM10_ug_m3',
      'MQ3_Raw_ADC',
      'Temp_C',
      'Humidity_Pct',
      'GPS_Lat',
      'GPS_Lng',
      'Transport',
      'RSSI_dBm',
    ];

    const rows = historicalData.map((d) => [
      new Date(d.timestamp).toISOString(),
      d.deviceId,
      d.source || 'hardware',
      d.recordedBy || 'device',
      d.sensors.pm1_0 ?? '',
      d.sensors.pm2_5 ?? '',
      d.sensors.pm10 ?? '',
      d.sensors.mq3_raw ?? '',
      d.sensors.temperature_c ?? '',
      d.sensors.humidity_percent ?? '',
      d.gps.latitude ?? '',
      d.gps.longitude ?? '',
      d.connectivity.transport,
      d.connectivity.rssi_dbm ?? '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sjec_aqms_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Historical Sensor Charts */}
      <HistoricalCharts
        data={historicalData}
        timeWindowHours={timeWindowHours}
        onTimeWindowChange={setTimeWindowHours}
        isLoading={false}
        isDemoMode={isDemoMode}
      />

      {/* Header and Controls */}
      <div className="bg-surface-cardLight dark:bg-surface-cardDark p-6 rounded-2xl border border-surface-borderLight dark:border-surface-borderDark shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Database className="w-5 h-5 text-institute-blue dark:text-sky-400" />
            <span>Telemetry History Records</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Browse stored environmental packets or export research data for offline analysis.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            disabled={historicalData.length === 0}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-institute-blue hover:bg-institute-accent dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV ({historicalData.length} Records)</span>
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-surface-cardLight dark:bg-surface-cardDark rounded-2xl border border-surface-borderLight dark:border-surface-borderDark shadow-sm overflow-hidden">
        
        {/* Search Bar */}
        <div className="p-4 border-b border-surface-borderLight dark:border-surface-borderDark bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between">
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by timestamp or ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <span className="text-xs text-slate-500">
            Showing {currentItems.length} of {filtered.length} records
          </span>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3">PM1.0</th>
                <th className="py-3 px-3">PM2.5</th>
                <th className="py-3 px-3">PM10</th>
                <th className="py-3 px-3">MQ-3 (ADC)</th>
                <th className="py-3 px-3">Temp (°C)</th>
                <th className="py-3 px-3">Humidity (%)</th>
                <th className="py-3 px-3">GPS Fix</th>
                <th className="py-3 px-3">Source / Transport</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No historical telemetry records match your filter.
                  </td>
                </tr>
              ) : (
                currentItems.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatTimestamp(row.timestamp)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-900 dark:text-white font-semibold">
                      {row.sensors.pm1_0?.toFixed(1) ?? '--'}
                    </td>
                    <td className="py-2.5 px-3 text-sky-600 dark:text-sky-400 font-semibold">
                      {row.sensors.pm2_5?.toFixed(1) ?? '--'}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-semibold">
                      {row.sensors.pm10?.toFixed(1) ?? '--'}
                    </td>
                    <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400">
                      {row.sensors.mq3_raw ?? '--'}
                    </td>
                    <td className="py-2.5 px-3 text-orange-600 dark:text-orange-400">
                      {row.sensors.temperature_c?.toFixed(1) ?? '--'}
                    </td>
                    <td className="py-2.5 px-3 text-cyan-600 dark:text-cyan-400">
                      {row.sensors.humidity_percent?.toFixed(1) ?? '--'}
                    </td>
                    <td className="py-2.5 px-3">
                      {row.gps.valid ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {formatGpsCoordinate(row.gps.latitude, true)}
                        </span>
                      ) : (
                        <span className="text-slate-400">No Fix</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[10px]">
                      {row.source === 'manual' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800" title={`Recorded by ${row.recordedBy || 'admin'}`}>
                          Manual Entry
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono">
                          {row.connectivity.transport}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}

      </div>

    </div>
  );
};

export default HistoricalDataTab;
