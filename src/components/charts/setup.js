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
import { TreemapController, TreemapElement } from 'chartjs-chart-treemap'

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
  TreemapController,
  TreemapElement,
)

export { ChartJS }
