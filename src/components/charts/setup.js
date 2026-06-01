// Zentrale Chart.js-Registrierung (einmal importieren, idempotent).
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { SankeyController, Flow } from 'chartjs-chart-sankey'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  SankeyController,
  Flow,
)

export { ChartJS }
