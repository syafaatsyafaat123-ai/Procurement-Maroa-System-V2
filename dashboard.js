/**
 * Maroa PMS - Dashboard & Metrics Module
 * PT. MAROA TUNGGA ABADI
 */

const Dashboard = {
    revenueChart: null,
    statusChart: null,

    async load() {
        const container = document.getElementById('view-dashboard');
        if (!container) return;

        try {
            const data = await API.get('/dashboard/stats/');
            this.renderKPIs(data.kpis);
            this.renderCharts(data.charts, data.status_distribution);
            this.renderRecentQuotations(data.recent_quotations);
            this.renderRecentPOs(data.recent_pos);
            this.renderAuditFeed(data.recent_audits);
        } catch (error) {
            console.error('Failed to load dashboard statistics:', error);
            showToast('Gagal memuat ringkasan dashboard.', 'error');
        }
    },

    renderKPIs(kpis) {
        if (!kpis) return;
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setVal('kpi-total-quotations-val', kpis.total_quotations_value);
        setVal('kpi-total-quotations-count', `${kpis.total_quotations} Dokumen`);
        setVal('kpi-conversion-rate', kpis.conversion_rate);
        setVal('kpi-total-po-val', kpis.total_po_value);
        setVal('kpi-active-pos', `${kpis.active_pos} Aktif / ${kpis.total_pos} Total`);
        setVal('kpi-completed-basts', `${kpis.completed_basts} BAST`);
        setVal('kpi-master-counts', `${kpis.total_products} Produk | ${kpis.total_customers} Klien`);
    },

    renderCharts(trendData, statusData) {
        // 1. Monthly Revenue & Quotation Trend Chart
        const trendCanvas = document.getElementById('chart-revenue-trend');
        if (trendCanvas && trendData && window.Chart) {
            if (this.revenueChart) this.revenueChart.destroy();

            const ctx = trendCanvas.getContext('2d');
            this.revenueChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: trendData.labels,
                    datasets: [
                        {
                            label: 'Nilai Penawaran (QS)',
                            data: trendData.quotations,
                            backgroundColor: 'rgba(30, 58, 138, 0.85)',
                            borderRadius: 6,
                        },
                        {
                            label: 'Realisasi Purchase Order (PO)',
                            data: trendData.purchase_orders,
                            backgroundColor: 'rgba(13, 148, 136, 0.85)',
                            borderRadius: 6,
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top', labels: { font: { family: 'Inter', size: 11 } } },
                        tooltip: {
                            callbacks: {
                                label: (context) => `${context.dataset.label}: ${formatRupiah(context.raw)}`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (val) => 'Rp ' + (val / 1000000).toFixed(0) + ' Jt',
                                font: { family: 'Inter', size: 10 }
                            }
                        },
                        x: {
                            ticks: { font: { family: 'Inter', size: 11 } }
                        }
                    }
                }
            });
        }

        // 2. Status Doughnut Chart
        const statusCanvas = document.getElementById('chart-status-breakdown');
        if (statusCanvas && statusData && window.Chart) {
            if (this.statusChart) this.statusChart.destroy();

            const ctx = statusCanvas.getContext('2d');
            this.statusChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Draft', 'Sent', 'Approved', 'Converted', 'Rejected'],
                    datasets: [{
                        data: [
                            statusData.DRAFT || 0,
                            statusData.SENT || 0,
                            statusData.APPROVED || 0,
                            statusData.CONVERTED || 0,
                            statusData.REJECTED || 0
                        ],
                        backgroundColor: ['#94a3b8', '#3b82f6', '#10b981', '#0d9488', '#ef4444'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11 }, boxWidth: 12 } }
                    },
                    cutout: '70%'
                }
            });
        }
    },

    renderRecentQuotations(list) {
        const tbody = document.getElementById('table-recent-quotations');
        if (!tbody) return;

        if (!list || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-slate-400">Belum ada penawaran.</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(q => {
            const badgeClass = `badge-${q.status.toLowerCase()}`;
            return `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100 last:border-0 text-sm">
                    <td class="py-3 px-3 font-semibold text-blue-900 font-mono-code">${q.number}</td>
                    <td class="py-3 px-3 font-medium text-slate-800">${q.customer}</td>
                    <td class="py-3 px-3 text-slate-500">${q.date}</td>
                    <td class="py-3 px-3 font-semibold text-slate-900">${q.total}</td>
                    <td class="py-3 px-3">
                        <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}">
                            ${q.status_display}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    },

    renderRecentPOs(list) {
        const tbody = document.getElementById('table-recent-pos');
        if (!tbody) return;

        if (!list || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-slate-400">Belum ada purchase order.</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(p => {
            return `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100 last:border-0 text-sm">
                    <td class="py-3 px-3 font-semibold text-teal-800 font-mono-code">${p.number}</td>
                    <td class="py-3 px-3 font-medium text-slate-800">${p.supplier}</td>
                    <td class="py-3 px-3 text-slate-500">${p.date}</td>
                    <td class="py-3 px-3 font-semibold text-slate-900">${p.total}</td>
                    <td class="py-3 px-3">
                        <span class="px-2.5 py-1 rounded-full text-xs font-semibold badge-issued">
                            ${p.status_display}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    },

    renderAuditFeed(logs) {
        const listEl = document.getElementById('feed-recent-audits');
        if (!listEl) return;

        if (!logs || logs.length === 0) {
            listEl.innerHTML = '<div class="text-sm text-slate-400 py-4 text-center">Belum ada catatan aktivitas.</div>';
            return;
        }

        listEl.innerHTML = logs.map(a => {
            let icon = 'fa-circle-dot text-slate-400';
            if (a.action === 'CREATE') icon = 'fa-circle-plus text-emerald-500';
            if (a.action === 'UPDATE') icon = 'fa-pen-to-square text-blue-500';
            if (a.action === 'CONVERT') icon = 'fa-arrow-right-arrow-left text-teal-500';
            if (a.action === 'EXPORT_PDF') icon = 'fa-file-pdf text-red-500';
            if (a.action === 'LOGIN') icon = 'fa-right-to-bracket text-purple-500';

            return `
                <div class="flex items-start gap-3 text-xs py-2 border-b border-slate-100 last:border-0">
                    <i class="fa-solid ${icon} mt-0.5"></i>
                    <div class="flex-1">
                        <div class="font-medium text-slate-800"><span class="font-bold text-slate-900">${a.user}</span>: ${a.object_repr}</div>
                        <div class="text-slate-400 mt-0.5">${a.time} • Modul ${a.module}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
};

window.Dashboard = Dashboard;
