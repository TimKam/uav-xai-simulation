import $$ from 'dom7'
import Framework7 from 'framework7/framework7.esm.bundle.js'
import 'framework7/css/framework7.bundle.css'
// Icons and App Custom Styles
import '../css/icons.css'
import '../css/app.css'
// Import Routes
import routes from './routes.js'
// Game of Life
import GridWorld from './UAVGridWorld'

var app = new Framework7({ // eslint-disable-line no-unused-vars
  root: '#app', // App root element

  name: 'JS-son: Game of Life', // App name
  theme: 'auto', // Automatic theme detection
  // App root data
  data: () => {
    $$(document).on('page:init', e => {
      let gridWorld = GridWorld()
      let shouldRestart = false
      $$('.restart-button').on('click', () => {
        shouldRestart = true
      })
      window.setInterval(() => {
        if (shouldRestart) {
          shouldRestart = false
          gridWorld = GridWorld()
        } else {
          gridWorld.run(1)
          console.log(gridWorld)
          $$('#arena-grid').html(gridWorld.render(gridWorld.state))
          $$('#analysis').html(`
            <table>
              <tr>
                <td><strong>UAV No.</strong></td>
                ${gridWorld.state.positions.map((_, index) => `<td>${index}</td>`).join('')}
              </tr>
              <tr>
                <td><strong>Capacity</strong></td>
                ${gridWorld.state.capacity.map(capacity => `<td>${capacity}</td>`).join('')}
              </tr>
              <tr>
                <td><strong>Battery</strong></td>
                ${gridWorld.state.battery.map(batteryLevel => `<td>${batteryLevel}</td>`).join('')}
              </tr>
              <tr>
                <td><strong>Package loaded?</strong></td>
                ${gridWorld.state.packageLoaded.map(packageLoaded => `<td>${packageLoaded}</td>`).join('')}
              </tr>
              <tr>
                <td><strong>Current task</strong></td>
                ${gridWorld.state.missions.map(mission => `<td>${mission.type === 'goto' ? `Go to ${mission.target}` : 'Idle'}</td>`).join('')}
              </tr>
            </table>
          `)
        }
      }, 2000)
    })
  },
  // App routes
  routes: routes
})
