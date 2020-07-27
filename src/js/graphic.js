require("babel-core/register");
require("babel-polyfill");
import isMobile from "./utils/is-mobile";



/* global d3 */

let PADDING, CIRCLE_SIZE, XSCALE, XACCESSOR, XDOMAIN, YSCALE, YACCESSOR, YDOMAIN, ANGLE_SCALE, RADIUS_SCALE, INNER_RADIUS, OUTER_RADIUS, BOUNDS, DIMENSIONS, NEGATIVE_SCALE, POSITIVE_SCALE
const MAX_ELEVATION = 8850 // deca-meters -> Mt. Everest
const MIN_ELEVATION = -11050 // deca-meters -> Mariana Trench
const EARTH_CIRCUMFERENCE = 40075000 // meters
const METERS_TO_FEET = 3.28084
const METERS_TO_MILES = 0.000621371
const STAR_SIZE = 100
const LONGITUDE_INCREMENT = 0.0166658951
const S3_FOLDER = "around-the-world"
const S3_REGION = "us-east-2"
const S3_BASE_URL = `https://article-data.s3.${S3_REGION}.amazonaws.com/${S3_FOLDER}`
const MARIANA_TRENCH_LAT = 11.3733
const MARIANA_TRENCH_LON = 142.5917


const CALLIGRAPHY_ID = "#calligraphy-wrapper"
const JOY_DIVISION_ID = "#joy-division-wrapper"
const DETAILED_ID = "#detailed-wrapper"

function resize() {

}

function init() {
	if(isMobile.any()) {
		d3.select(".intro").style("padding-top", "4.5rem");
		d3.selectAll(".wrapper-container")
			.attr("height", "50vw")
			.attr("width", "100%")
		d3.selectAll(".toggle")
			.style("font-size", "12px")
			.style("width", "85px")

		const calligraphyWrapper = setConfig(CALLIGRAPHY_ID)
		drawRidgelines(CALLIGRAPHY_ID, calligraphyWrapper, DIMENSIONS, BOUNDS, 200, 3.2, 25, 100)
		drawRidgelines(JOY_DIVISION_ID, calligraphyWrapper, DIMENSIONS, BOUNDS, 250, 1.32, 35)
		drawRidgelines(DETAILED_ID, calligraphyWrapper, DIMENSIONS, BOUNDS, 250, 1.32, 35)

	} else {
		const calligraphyWrapper = setConfig(CALLIGRAPHY_ID)
		drawRidgelines(CALLIGRAPHY_ID, calligraphyWrapper, DIMENSIONS, BOUNDS, 200, 3.2, 25)
		drawRidgelines(JOY_DIVISION_ID, calligraphyWrapper, DIMENSIONS, BOUNDS, 500, 1.6, 50)
		drawRidgelines(DETAILED_ID, calligraphyWrapper, DIMENSIONS, BOUNDS, 500, 1.6, 50)
	}


}

function setConfig(wrapperId) {
	let wrapper
	const wrapperWidth = d3.select(wrapperId).node().offsetWidth
	DIMENSIONS = {
		width: wrapperWidth,
		height: wrapperWidth / 2,
		margin: {
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
		},
	}
	DIMENSIONS.radius = Math.min(DIMENSIONS.width / 2, DIMENSIONS.height / 2)
	DIMENSIONS.boundedWidth = DIMENSIONS.width - DIMENSIONS.margin.left - DIMENSIONS.margin.right
	DIMENSIONS.boundedHeight = DIMENSIONS.height - DIMENSIONS.margin.top - DIMENSIONS.margin.bottom
	DIMENSIONS.boundedRadius = DIMENSIONS.radius - ((DIMENSIONS.margin.left + DIMENSIONS.margin.right) / 2)

	const svgId = `${wrapperId}-svg`
	if (d3.selectAll(svgId)._groups[0].length === 0) {
		wrapper = d3.select(wrapperId)
			.append("svg")
				.attr("id", svgId)
				.style("transform", `translate(${wrapperWidth / 2 - DIMENSIONS.width / 2}px, ${0}px)`)
				.attr("width", DIMENSIONS.width)
				.attr("height", DIMENSIONS.height)
	} else {
		wrapper
			.style("transform", `translate(${wrapperWidth / 2 - DIMENSIONS.width / 2}px, ${0}px)`)
			.attr("width", DIMENSIONS.width)
			.attr("height", DIMENSIONS.height)
	}
	return wrapper
}


async function drawRidgelines(wrapperId, wrapper, dimensions, bounds, numIndices, spacing, peaking, calligraphy=15) {
	const leftButton = d3.select("#toggle-left")
	const middleButton = d3.select("#toggle-middle")
	const rightButton = d3.select("#toggle-right")
	const allButtons = [leftButton, middleButton, rightButton]
	leftButton.on("click", onToggleClick)
	middleButton.on("click", onToggleClick)
	rightButton.on("click", onToggleClick)

	function onToggleClick() {
		const clickedId = d3.select(this).nodes()[0].id
		const clickedButton = clickedId === "toggle-left" ? leftButton : (clickedId === "toggle-right" ? rightButton : middleButton)

		let unclickedButtons = []
		for (var i = 0; i < allButtons.length; i++) {
			const button = allButtons[i]
			if (button !== clickedButton) {
				unclickedButtons.push(button)
			}
		}
		const unclickedButtonOne = unclickedButtons[0]
		const unclickedButtonTwo = unclickedButtons[1]

		unclickedButtonOne.style("background-color", "white")
		unclickedButtonTwo.style("background-color", "white")
		unclickedButtonOne.style("color",  "#83838388")
		unclickedButtonTwo.style("color",  "#83838388")
		unclickedButtonOne.style("font-weight",  "normal")
		unclickedButtonTwo.style("font-weight",  "normal")
		unclickedButtonOne.style("border-top",  "1px solid #83838344")
		unclickedButtonTwo.style("border-top",  "1px solid #83838344")
		unclickedButtonOne.style("border-bottom",  "1px solid #83838344")
		unclickedButtonTwo.style("border-bottom",  "1px solid #83838344")
		unclickedButtonOne.style("border-left",  "1px solid #83838344")
		unclickedButtonTwo.style("border-left",  "1px solid #83838344")
		unclickedButtonOne.style("border-right",  "1px solid #83838344")
		unclickedButtonTwo.style("border-right",  "1px solid #83838344")


		if (clickedId === "toggle-left") {
			clickedButton.style("background-color", "#88888811")
			clickedButton.style("border",  "1px solid #888888")
			clickedButton.style("color",  "black")
			clickedButton.style("font-weight",  "bold")

			wrapper.style("background-color", "white")
			d3.selectAll("*[class^=calligraphy-]").style("opacity", 1).style("stroke-width", 0.75)
			d3.selectAll("*[class^=joydivision-]").style("opacity", 0)
			d3.selectAll("*[class^=earth-]").style("opacity", 0)
		}
		if (clickedId === "toggle-middle") {
			clickedButton.style("background-color", "#000000")
			clickedButton.style("border",  "1px solid black")
			clickedButton.style("color",  "white")
			clickedButton.style("font-weight",  "bold")
			
			d3.selectAll("*[class^=calligraphy-]").style("opacity", 0).style("stroke-width", 0)
			d3.selectAll("*[class^=joydivision-]").style("opacity", 1)
			d3.selectAll("*[class^=earth-]").style("opacity", 0)
			wrapper.style("background-color", "black")
		}
		if (clickedId === "toggle-right") {
			clickedButton.style("background-color", "#54a0ff22")
			clickedButton.style("border",  "1px solid #3DC257")
			clickedButton.style("color",  "#3DC257")
			clickedButton.style("font-weight",  "bold")
			
			wrapper.style("background-color", "white")
			d3.selectAll("*[class^=calligraphy-]").style("opacity", 0).style("stroke-width", 0)
			d3.selectAll("*[class^=joydivision]").style("opacity", 0)
			d3.selectAll("*[class^=earth-]").style("opacity", 1)
		}
	}


	let calligraphyOpacity = 1
	let detailedOpacity = 0
	let joyDivisionOpacity = 0

	var pathData = await d3.json(`/assets/data/ridgeline_${numIndices}.json`)
	const wrapperHeight = d3.select(CALLIGRAPHY_ID).node().offsetHeight
	const positivePaths = pathData.pos
	const negativePaths = pathData.neg

	YDOMAIN = [MIN_ELEVATION, -MIN_ELEVATION]
	XDOMAIN = [0, numIndices]

	XSCALE = d3.scaleLinear()
		.domain(XDOMAIN)
		.range([0, dimensions.boundedWidth + 20])
	YSCALE = d3.scaleLinear()
		.domain(YDOMAIN)
		.range([peaking * wrapperHeight / (numIndices), 0])


	const ridgelineGenerator = d3.line()
		.x(d => XSCALE(d.x))
		.y(d => d.y)
		.curve(d3.curveBasis)

	// if (wrapperId === CALLIGRAPHY_ID) {
	// 	const formattedPositivePaths = getAllFormattedRidgelineData(positivePaths, numIndices, spacing)
	// 	const positiveRidgelines = wrapper.selectAll(".calligraphy-path")
	//   		.data(formattedPositivePaths)
	//   		.enter()
	//   		.append("path")
	// 			.attr("class", "calligraphy-path")
	// 			.attr("d", (d) => ridgelineGenerator(d))
	// 			.attr("fill", "#00000044")
	// 			.attr("stroke", '#000000')
	// 			.attr("stroke-width", 0.75)
	// 			.attr("opacity", 0)
	// }
	if (wrapperId === JOY_DIVISION_ID) {
		const formattedPositivePaths = getAllFormattedRidgelineData(positivePaths, numIndices, spacing)
		// wrapper.style("background-color", "black")
		const positiveRidgelines = wrapper.selectAll(".joydivision-path")
	  		.data(formattedPositivePaths)
	  		.enter()
	  		.append("path")
				.attr("class", "joydivision-path")
				.attr("d", (d) => ridgelineGenerator(d))
				// .attr("fill", "#ffffff44")
				.attr("stroke", '#ffffff')
				.attr("stroke-width", isMobile.any() ? 0.25 : 1)
				.attr("opacity", 0)
	}

	if (wrapperId === DETAILED_ID) {
		const formattedPositivePaths = getAllFormattedRidgelineData(positivePaths, numIndices, spacing)
		const positiveRidgelines = wrapper.selectAll(".earth-positive-path")
	  		.data(formattedPositivePaths)
	  		.enter()
	  		.append("path")
				.attr("class", "earth-positive-path")
				.attr("id", (d,i) => `${i}`)
				.attr("d", (d) => ridgelineGenerator(d))
				.attr("fill", "#3DC25744")
				.attr("stroke", '#3DC257')
				.attr("stroke-width", isMobile.any() ? 0.25 : 0.75)
				.attr("opacity", detailedOpacity)

		const formattedNegativePaths = getAllFormattedRidgelineData(negativePaths, numIndices, spacing)
		const negativeRidgelines = wrapper.selectAll(".earth-negative-path")
	  		.data(formattedNegativePaths)
	  		.enter()
	  		.append("path")
				.attr("class", "earth-negative-path")
				.attr("d", (d) => ridgelineGenerator(d))
				.attr("fill", "#54a0ff44")
				.attr("stroke", '#54a0ff')
				.attr("stroke-width", isMobile.any() ? 0.25 : 0.5)
				.attr("opacity", detailedOpacity)
	}


	if (wrapperId === CALLIGRAPHY_ID) {
	    getAllFormattedRidgelineRibbons(wrapper, positivePaths, "black", calligraphy, numIndices, spacing)
	}
    // getAllFormattedRidgelineRibbons(negativePaths, "#54a0ff", 30)
	    
}

function getAllFormattedRidgelineRibbons(wrapper, ridgelineData, color, scale, numIndices, spacing) {
	let allRidgelineRibbonData = []
	for (var i = 0; i < Object.keys(ridgelineData).length; i++) {
			const index = Object.keys(ridgelineData)[i]
			const indexRidgelineData = ridgelineData[index]

			for (var j = 0; j < Object.keys(indexRidgelineData).length; j++) {
				const key = Object.keys(indexRidgelineData)[j]
				const formattedRidgelineRibbon = formatRidgelineRibbon(indexRidgelineData, key, index, scale, numIndices, spacing)
				plotRidgelineRibbon(wrapper, formattedRidgelineRibbon, color)
				allRidgelineRibbonData.push(formattedRidgelineRibbon)
			}		
	}
		
	return allRidgelineRibbonData
}

function formatRidgelineRibbon(ridgelineData, key, index, scale, numIndices, spacing) {
	const splitKey = key.split(":")
	const startIndex = parseFloat(splitKey[0])
	const endIndex = parseFloat(splitKey[1])
	const startInteger = Math.ceil(startIndex)
	const endInteger = Math.floor(endIndex)

	let indices = range(startInteger, endInteger)
	if (startIndex !== startInteger) {
		indices.unshift(startIndex)
	}
	if (endIndex !== endInteger) {
		indices.push(endIndex)
	}

	const elevations = ridgelineData[key]

	let topLine = {"x": [], "y": []}
	let bottomLine = {"x": [], "y": []}
	if (elevations.length === (indices.length - 1)) {
		elevations.push(0)
	}

	for (var i = 0; i < elevations.length; i++) {
		let xValue = indices[i]
		if (xValue === undefined) {
			xValue = numIndices
		}

		const elevation = elevations[i]
		const elevationAdjustment = Math.sqrt(Math.abs(elevation)) / scale

		const scaledElevation = DIMENSIONS.height / numIndices * spacing * index + YSCALE(elevation)
		const scaledAdjustedElevation = DIMENSIONS.height / numIndices * spacing * index + YSCALE(elevation) + elevationAdjustment
		
		const lowerElevation = (scaledElevation >= scaledAdjustedElevation) ? scaledElevation : scaledAdjustedElevation
		const higherElevation = (scaledElevation >= scaledAdjustedElevation) ? scaledAdjustedElevation : scaledElevation

		topLine.x.push(xValue)
		topLine.y.push(higherElevation)
		bottomLine.x.push(xValue)
		bottomLine.y.push(lowerElevation)

	}
	const results = {
		"topLine": topLine,
		"bottomLine": bottomLine
	}
	return results
}


function plotRidgelineRibbon(wrapper, results, color) {
	const topLine = results["topLine"]
	const bottomLine = results["bottomLine"]
    var areaIndices = d3.range(topLine.x.length);
	var area = d3.area()
		.x0(d => XSCALE(topLine.x[d]))
		.x1(d => XSCALE(bottomLine.x[d]))
		.y0(d => topLine.y[d])
		.y1(d => bottomLine.y[d])
		.curve(d3.curveBasis)
	wrapper.append('path')
		.datum(areaIndices)
		.attr('class', 'calligraphy-ribbon')
		.attr('d', area)
		.style("fill", color)
}


function getAllFormattedRidgelineData(ridgelineData, numIndices, spacing) {
	let allRidgelineData = []
	for (var i = 0; i < Object.keys(ridgelineData).length; i++) {
		const index = Object.keys(ridgelineData)[i]
		const indexRidgelineData = ridgelineData[index]

		for (var j = 0; j < Object.keys(indexRidgelineData).length; j++) {
			const key = Object.keys(indexRidgelineData)[j]
			const formattedRidgelineData = formatRidgelineData(indexRidgelineData, key, index, numIndices, spacing)
			allRidgelineData.push(formattedRidgelineData)
		}		
	}
	return allRidgelineData
}

function formatRidgelineData(ridgelineData, key, index, numIndices, spacing) {
	const splitKey = key.split(":")
	const startIndex = parseFloat(splitKey[0])
	const endIndex = parseFloat(splitKey[1])
	const startInteger = Math.ceil(startIndex)
	const endInteger = Math.floor(endIndex)

	let indices = range(startInteger, endInteger)
	if (startIndex !== startInteger) {
		indices.unshift(startIndex)
	}
	if (endIndex !== endInteger) {
		indices.push(endIndex)
	}
	let formattedRidgelineData = []
	let scaledElevations = []
	const elevations = ridgelineData[key]

	if (elevations.length === (indices.length - 1)) {
		elevations.push(0)
	}

	for (var i = 0; i < elevations.length; i++) {
		const elevation = elevations[i]
		const scaledElevation = DIMENSIONS.height / numIndices * spacing * index + YSCALE(elevation)
		scaledElevations.push(scaledElevation)
		let xValue = indices[i]
		if (xValue === undefined) {
			xValue = numIndices
		}
		formattedRidgelineData.push({"x": xValue, "y": scaledElevation})
	}
	return formattedRidgelineData
}

function range(start, end) {
	const range = Array(end - start + 1).fill().map((_, idx) => start + idx)
  	return range
}


export default { init, resize };
