import $$ from 'dom7'
import Framework7 from 'framework7/framework7.esm.bundle.js'
import 'framework7/css/framework7.bundle.css'

import toastr from 'toastr'

// Icons and App Custom Styles
import '../css/icons.css'
import '../css/app.css'
// Import Routes
import routes from './routes.js'
// Game of Life
import GridWorld from './UAVGridWorld'

const url = new URL(window.location.href)
const mode = url.searchParams.get('mode')
const speedParam = url.searchParams.get('speed')
const speed = speedParam ? Number(speedParam) : 1

toastr.options.newestOnTop = false
toastr.options.preventDuplicates = true

const missionTypeHistory = []

let disorientedDronesMessage
let longIdleDronesMessage

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
          if ((mode === 'filter' || mode === 'cont') && gridWorld.state.missions.length > 3) {
            missionTypeHistory.push(gridWorld.state.missions.map(mission => mission.type))
            const droneIds = gridWorld.state.missions.map(((_, index) => index))
            //const activeDrones = droneIds.filter((id => gridWorld.state.missions[id].type === 'goto'))
            const fetchingDrones = droneIds.filter(  // active AND target is packet
              (
                id => gridWorld.state.missions[id].type === 'goto' &&
                gridWorld.state.fields[gridWorld.state.missions[id].target] === 'package'
              )
            )
            const deliveringDrones = droneIds.filter( // active AND target is delivery destination
              (
                id =>
                gridWorld.state.missions[id].type === 'goto' &&
                gridWorld.state.fields[gridWorld.state.missions[id].target] === 'target'
              )
            )
            const chargingDrones = droneIds.filter( // active AND target is charging station
              (
                id =>
                gridWorld.state.missions[id].type === 'goto' &&
                gridWorld.state.fields[gridWorld.state.missions[id].target] === 'station'
              )
            )
            const idleDrones = droneIds.filter((id => gridWorld.state.missions[id].type !== 'goto'))
            const longIdleDrones = droneIds.filter(
              (
                id =>
                gridWorld.state.missions[id].type !== 'goto' &&
                missionTypeHistory.length > 1 &&
                missionTypeHistory[missionTypeHistory.length - 1][id] !== 'goto' && 
                missionTypeHistory[missionTypeHistory.length - 2][id] !== 'goto'
              )
            )
            const longIdleDronesWaitingTimes = longIdleDrones.map(
              droneId => {
                let waitingTime = 1
                const reversedHistory = missionTypeHistory.slice().reverse()
                reversedHistory.every(
                  missions => {
                    if (missions[droneId].type !== 'goto') {
                      waitingTime++
                      return true
                    }
                    else { return false }
                  }
                )
                return waitingTime + 1
              }
            )
            const disorientedDrones = droneIds.filter( // active AND target is plain field
              (
                id =>
                gridWorld.state.missions[id].type === 'goto' &&
                gridWorld.state.fields[gridWorld.state.missions[id].target] === 'plain'
              )
            )
            $$('#analysis').html(`
              <table class="bdi">
                <tr>
                <td><strong>${fetchingDrones.length} drone(s) on way to package ${fetchingDrones.length === 0 ? '' : ':'}</strong></td>
                  <td><strong>${deliveringDrones.length} drone(s) on way to target ${deliveringDrones.length === 0 ? '' : ':'}</strong></td>
                  <td><strong>${chargingDrones.length} drone(s) need(s) re-charge ${chargingDrones.length === 0 ? '' : ':'}</strong></td>
                  <td><strong>${idleDrones.length} drone(s) idle ${idleDrones.length === 0 ? '' : ':'}</strong></td>
                <tr/>
                <tr>
                  <td>
                  ${fetchingDrones.join(',')}
                  </td>
                  <td>
                  ${deliveringDrones.join(',')}
                  </td>
                  <td>
                  ${chargingDrones.join(',')}
                  </td>
                  <td>
                  ${idleDrones.join(',')}
                  </td>
                </tr>
              </table>
            `)
            if (disorientedDrones.length !== 0) {
              const newDisorientedDronesMessage = `${mode === 'cont' ? `<strong>No clear target</strong> for drone(s) <strong>${disorientedDrones.join(',')}</strong>: assigned package(s) just picked up by other drone(s).` : `Drones <strong>${disorientedDrones.join(',')}</strong>: target set to <strong>empty field</strong>.`}`
              if (disorientedDronesMessage != newDisorientedDronesMessage) {
                if (document.getElementsByClassName('toast-warning')[0]) {
                  document.getElementsByClassName('toast-warning')[0].innerHTML =
                    `<div class="toast-title"></div><div class="toast-message">${newDisorientedDronesMessage}</div>`
                } else {
                  toastr.warning(newDisorientedDronesMessage, {timeOut: 10000})
                }
              }
              disorientedDronesMessage = newDisorientedDronesMessage
            }
            if (longIdleDrones.length !== 0) {
              const newLongIdleDronesMessage = `${mode === 'cont' ? `Drone(s) <strong>${longIdleDrones.join(',')} not working</strong>: fully charged and all waiting packages (if any) are already assigned to a drone.` : `Drones <strong>${droneId}: idle</strong> since several turns.`}`
              if (longIdleDronesMessage != newLongIdleDronesMessage) {
                if (document.getElementsByClassName('toast-info')[0]) {
                  document.getElementsByClassName('toast-info')[0].innerHTML =
                  `<div class="toast-title"></div><div class="toast-message">${newLongIdleDronesMessage}</div>`
                } else {
                  toastr.info(newLongIdleDronesMessage, {timeOut: 10000})
                }
              }
              longIdleDronesMessage = newLongIdleDronesMessage
            }
          } else {
            $$('#analysis').html(`
            <table>
              <tr>
                <td><strong>Drone No.</strong></td>
                ${gridWorld.state.positions.map((_, index) => `<td>${index}</td>`).join('')}
              </tr>
              <tr>
                <td><strong>Battery</strong></td>
                ${gridWorld.state.battery.map(batteryLevel => `<td>${batteryLevel}</td>`).join('')}
              </tr>
              <tr>
                <td><strong>Package loaded?</strong></td>
                ${gridWorld.state.packageLoaded.map(packageLoaded => `<td>${packageLoaded ? 'Yes' : 'No'}</td>`).join('')}
              </tr>
              <tr>
                <td><strong>Current task</strong></td>
                ${gridWorld.state.missions.map(mission => `<td>${mission.type === 'goto' ? `Go to ${mission.target}` : 'Idle'}</td>`).join('')}
              </tr>
              <tr>
                <td><strong>Task type</strong></td>
                ${determineTaskTypes(gridWorld.state)}
              </tr>
              <tr>
              <td><strong>Position</strong></td>
              ${gridWorld.state.positions.map(position => `<td>${position}</td>`).join('')}
            </tr>
              <td><strong>Location type</strong></td>
              ${gridWorld.state.positions.map(position => `<td>${gridWorld.state.fields[position]}</td>`).join('')}
            </tr>
            </table>
          `)
          }
        }
      }, 2000 / speed) // 2000
    })
  },
  // App routes
  routes: routes
})

function determineTaskTypes (state) {
  const taskTypes = state.missions.map(mission => {
    let taskType = 'Idle'
    if (mission.type === 'goto') {
      const fieldType = state.fields[mission.target]
      taskType = `Go to ${fieldType}`
    }
    return `<td>${taskType}</td>`
  });
  return taskTypes.join('')
}
