// import js-son and assign Belief, Plan, Agent, GridWorld, and FieldType to separate consts
import { Belief, Desire, Plan, Agent, GridWorld, FieldType } from 'js-son-agent'

const numberOfDrones = 10
const maxBatteryLevel = 35

const numberToLetter = number => (number + 10).toString(36).toUpperCase()

const determineDistance = (position, target) => {
  const verticalDistance = Math.floor(position / 20) - Math.floor(target / 20)
  const horizontalDistance = position % 20 - target % 20
  return [horizontalDistance, verticalDistance]
}

const determineDirection = (position, target) => {
  const distance = determineDistance(position, target)
  const horizontalDistance = distance[0]
  const verticalDistance = distance[1]
  console.log(position, target, distance)
  if (verticalDistance > 0) {
    return 'up'
  } else if (verticalDistance < 0) {
    return 'down'
  } else if (horizontalDistance < 0) {
    return 'right'
  } else if (horizontalDistance > 0) {
    return 'left'
  } else {
    return 'idle'
  }
}

const determineNextMove = (state, agentId) => {
  const position = state.positions[agentId]
  const target = state.missions[agentId].target
  if (state.missions[agentId].type === 'goto' && position !== target) {
    return determineDirection(position, target)
  } else {
    if (state.packageLoaded[agentId]) {
      const mission = state.packageLoaded[agentId]
      state.missions[agentId] = mission
      determineDirection(position, mission.target)
      return determineDirection(position, mission.target)
    } else if (state.battery[agentId] < maxBatteryLevel) {
      const mission = {
        type: 'goto',
        target: determineClosestChargingStation(state, position) 
      }
      state.missions[agentId] = mission
      return determineDirection(position, mission.target)
    } else if (state.battery[agentId] >= maxBatteryLevel) {
      const packageMission = determinePackageMission(state, position, agentId)
      const mission = packageMission ? {
          type: 'goto',
          target: packageMission
        } :
        {
          type: 'idle'
        }
      state.missions[agentId] = mission
      return determineDirection(position, mission.target)
    } else {
      const mission = {
        'type': idle
      }
      state.missions[agentId] = mission
      return 'idle'
    }
    // get next mission
    // if packageLoaded: delivery package
    // else if battery full: search for package delivery option
    // else go to next charging station
  }
}

const determineClosestChargingStation = (state, position) => {
  const distances = state.chargePositions.map(
    chargePosition => determineDistance(position, chargePosition).map(
      distance => Math.abs(distance)
    ).reduce((a, b) => a + b, 0)
  )
  return state.chargePositions[distances.indexOf(Math.min(...distances))]
}

const determinePackageMission = (state, position, selfAgentId) => {
  const distances = state.packages.map(
    packet => 
      determineDistance(position, packet.position).map(
        distance => Math.abs(distance)
      ).reduce((a, b) => a + b, 0)
    )
  // TODO: coordination
  /*
        For each distance in distances:
          is there any other plane that:
            a: has full battery
            b: is currently not occupied
            c: can reach the packet more easily?
          if so: drop distance
  */
  const bestServedPackages = state.packages.filter((packet, packetIndex) => {
    const betterDrones = state.missions.filter((mission, agentId) => {
      const distance = determineDistance(state.positions[agentId], packet.position).map(
        distance => Math.abs(distance)
      ).reduce((a, b) => a + b, 0)
      if (
        mission.type !== 'idle' && mission.target !== packet.target ||
        distance > distances[packetIndex] ||
        distance === distances[packetIndex] && selfAgentId >= agentId
      ) return false
      distances.splice(packetIndex, 1)
      return true
    })
    if (betterDrones.length === 0) return true
    return false
  })
  return distances.length === 0 ? 
    undefined :
    state.packages[distances.indexOf(Math.min(...distances))].position

}

/* desires */
const desires = {
  ...Desire('go', beliefs => {
    return determineNextMove(beliefs.state, beliefs.id)
  })
}

const plans = [
  Plan(
    desires => desires.go === 'up',
    () => ({ go: 'up' })
  ),
  Plan(
    desires => desires.go === 'down',
    () => ({ go: 'down' })
  ),
  Plan(
    desires => desires.go === 'left',
    () => ({ go: 'left' })
  ),
  Plan(
    desires => desires.go === 'right',
    () => ({ go: 'right' })
  ),
  Plan(
    desires => desires.go === 'idle',
    () => ({ go: 'idle' })
  )
]

/*
 dynamically generate agents
*/
const generateAgents = initialState => initialState.positions.map((position, index) => {
  const beliefs = {
    ...Belief('position', position),
    ...Belief('battery', maxBatteryLevel),
    ...Belief('capacity', initialState.capacity[index]),
    ...Belief('packageLoaded', false),
    ...Belief('state', initialState),
    ...Belief('mission', 'idle'),
    ...Belief('id', index)
  }
  return new Agent(
    index,
    beliefs,
    desires,
    plans
  )
})

/* generate explainer agent */
/* const xAgentId = initialState.positions.length
const generateExplainerAgent = () => {
  const id = xAgentId
  const xAgentBeliefs = {
    ...Belief('complexity', undefined),
    ...Belief('dronesIdle', undefined),
    ...Belief('packagesWaiting', undefined),
    ...Belief('missions', undefined),
  }
  const desires = {

  }
  const plans = [
    Plan(intention)
  ]
}*/

/* generate pseudo-random initial state */
const generateInitialState = () => {
  const dimensions = [20, 20]
  const positions = []
  const packages = []
  const targetPositions = []
  const chargePositions = []
  const fields = Array(dimensions[0] * dimensions[1]).fill(0).map((_, index) => {
    const rand = Math.random()
    if (rand < 0.02) {
      targetPositions.push(index)
      return 'target'
    } else if (rand < 0.06) {
      if (targetPositions.length > 0) {
        console.log(index)
        packages.push({
          position: index,
          weight: Math.ceil(Math.random() * 5),
          target: targetPositions[targetPositions.length - 1] 
        })
        return 'package'
      } else {
        targetPositions.push(index)
        return 'target'
      }
    } else if (rand < 0.085) {
      chargePositions.push(index)
      return 'station'
    } else if (rand < 0.13 && positions.length < numberOfDrones) {
      positions.push(index)
      return 'plain'
    } else {
      return 'plain'
    }
  })
  return {
    packages,
    dimensions,
    positions,
    targetPositions,
    chargePositions,
    capacity: Array(numberOfDrones).fill(0).map(_ => Math.ceil(Math.random() * 5)),
    battery: Array(numberOfDrones).fill(maxBatteryLevel),
    missions: Array(numberOfDrones).fill(0).map(_ => ( {type: 'idle'} )),
    packageLoaded: Array(numberOfDrones).fill(false),
    fields
  }
}

const generateConsequence = (state, agentId, newPosition) => {
  switch (state.fields[newPosition]) {
    case 'plain':
      if (state.battery[agentId] > 0) {
        state.battery[agentId]--
        state.positions[agentId] = newPosition
      }
      break
    case 'package':
      if (state.battery[agentId] > 0) {
        state.battery[agentId]--
        if (!state.packageLoaded[agentId] && state.missions[agentId].target === newPosition) {
          state.fields[newPosition] = 'plain'
          const packet = state.packages.find(packet => packet.position === newPosition)
          state.packageLoaded[agentId] = packet.target
          state.packages.splice(state.packages.indexOf(packet), 1)
          state.missions[agentId].target = packet.target
          if (Math.random() < 0.5) {
            const newPackagePosition = Math.ceil(Math.random() * 400)
            if (state.fields[newPackagePosition] === 'plain')
              state.fields[newPackagePosition] = 'package'
              state.packages.push({
                position: newPackagePosition,
                weight: Math.ceil(Math.random() * 5),
                target: state.targetPositions[
                  Math.floor(Math.random() * state.targetPositions.length)
                ]
              })
          }
        }
        state.positions[agentId] = newPosition
      }
      break
    case 'target':
      if (state.battery[agentId] > 0) {
        state.battery[agentId]--
        if (state.packageLoaded[agentId] === newPosition) {
          state.packageLoaded[agentId] = false
          state.missions[agentId] = { type: 'idle' }
        }
        state.positions[agentId] = newPosition
      }
    case 'station':
      if (state.battery[agentId] < maxBatteryLevel) {
        state.battery[agentId] !== 29 ? state.battery[agentId] += 2 : state.battery[agentId] = maxBatteryLevel
        if (state.battery[agentId] === maxBatteryLevel) state.missions[agentId] = { type: 'idle' }
      } else {
        state.missions[agentId] = { type: 'idle' }
      }
      state.positions[agentId] = newPosition
      break
  }
  return state
}

const trigger = (actions, agentId, state, position) => {
  console.log(agentId)
  switch (actions[0].go) {
    case 'down':
      if (position && position + 20 < 400) {
        state = generateConsequence(state, agentId, position + 20)
      } else {
        state = generateConsequence(state, agentId, position)
      }
      break
    case 'up':
      if (position && position - 20 >= 0) {
        state = generateConsequence(state, agentId, position - 20)
      } else {
        state = generateConsequence(state, agentId, position)
      }
      break
    case 'left':
      if (position && position % 20 !== 0) {
        state = generateConsequence(state, agentId, position - 1)
      } else {
        state = generateConsequence(state, agentId, position)
      }
      break
    case 'right':
      if (position && position % 20 !== 19) {
        state = generateConsequence(state, agentId, position + 1)
      } else {
        state = generateConsequence(state, agentId, position)
      }
      break
    case 'idle':
      state = generateConsequence(state, agentId, position)
    break
  }
  return state
}

const stateFilter = (state, agentId, agentBeliefs) => ({
  ...agentBeliefs,
  capacity: state.capacity[agentId],
  mission: state.missions[agentId],
  battery: state.battery[agentId],
  packageLoaded: state.packageLoaded[agentId]
})

const fieldTypes = {
  target: FieldType(
    'target',
    () => 'target-field material-icons target',
    () => 'h',
    trigger,
    (state, position) =>
      `<div class="field-annotation">
        ${numberToLetter(state.targetPositions.indexOf(position))}
      </div>`
  ),
  package: FieldType(
    'package',
    () => 'package-field material-icons package',
    () => 'v',
    trigger,
    (state, position) => {
      const packet = state.packages.find(packet => packet.position === position)
      return packet ?
        `<div class="field-annotation">
          ${numberToLetter(state.targetPositions.indexOf(packet.target))}
        </div>` :
        ''
    }
  ),
  station: FieldType(
    'station',
    () => 'station-field material-icons charger',
    () => 'F',
    trigger
  ),
  plain: FieldType(
    'plain',
    (state, position) => state.positions.includes(position)
      ? 'plain-field material-icons drone'
      : 'plain-field',
    (state, position) => state.positions.includes(position)
      ? 'R'
      : '-',
    trigger,
    (state, position) => state.positions.includes(position)
      ? `<div class="field-annotation">${state.positions.indexOf(position)}</div>`
      : ''
  )
}

const UAVGridWorld = () => {
  const initialState = generateInitialState()
  return new GridWorld(
    generateAgents(initialState),
    initialState,
    fieldTypes,
    stateFilter
  )
}

export default UAVGridWorld
