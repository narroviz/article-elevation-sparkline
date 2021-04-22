require("babel-core/register");
require("babel-polyfill");
import isMobile from "./utils/is-mobile";

/* global d3 */
let NUM_GAMES, START_YEAR, END_YEAR, INTERVAL, GAME_TICK_INTERVAL, DEFAULT_TEAM, PADDING, BEST_WINS, MEDIOCRE_WINS, WORST_WINS, FONT_SIZE, IS_DEFAULT_CLICK
const PATH_ID = '#paths-wrapper'
const NBA = 'NBA'
const WNBA = 'WNBA'
const LEAGUE = NBA

function resize() {
	drawExplanatoryGraph(LEAGUE)
	drawSeasonPaths(LEAGUE)
}

function init() {
	setConfig(LEAGUE)
	// drawRecordigamiBarChart(LEAGUE)
	// drawRecordigami(LEAGUE)
	drawExplanatoryGraph(LEAGUE)
	drawSeasonPaths(LEAGUE)
}

const teamAccessor = d => d.team
const teamParentAccessor = d => d.parent
const dateAccessor = d => new Date(d.date * 1000) //convert to milliseconds
const yearAccessor = d => d.year
const colorAccessor = d => d.primary_color
const secondaryColorAccessor = d => d.secondary_color
const winAccessor = d => d.win
const lossAccessor = d => d.loss
const countAccessor = d => d.count


async function setConfig(league) {
	IS_DEFAULT_CLICK = false
	if (league == WNBA) {
		START_YEAR = 1997
		END_YEAR = 2020
		NUM_GAMES = 34
		INTERVAL = 10
		GAME_TICK_INTERVAL = 5
		DEFAULT_TEAM = "Washington Mystics"
		PADDING = 2
		BEST_WINS = 29
		MEDIOCRE_WINS = 17
		WORST_WINS = 4
		FONT_SIZE = 15
	} else if (league == NBA) {
		START_YEAR = 1946
		END_YEAR = 2021
		NUM_GAMES = 82
		INTERVAL = 10
		GAME_TICK_INTERVAL = 10
		DEFAULT_TEAM = "Atlanta Hawks"
		PADDING = 1
		BEST_WINS = 73
		MEDIOCRE_WINS = 41
		WORST_WINS = 9
		FONT_SIZE = 15
		if (isMobile.any()) {
			PADDING = 0.5
			FONT_SIZE = 10
		}
	}
}

function drawBaseTiles(league, wrapperId=".wrapper-container", extra='', shouldTranslate=true) {
	// 2. Define Dimensions
	d3.select(`.${extra}svg`).remove()
	d3.select(`.${extra}bounds`).remove()
	// d3.select('.bounds-background').remove()

	const wrapperWidth = d3.select(wrapperId).node().offsetWidth
	const wrapperHeight = d3.select(wrapperId).node().offsetHeight
	let width = d3.min([
		1 * wrapperWidth,
		1 * wrapperHeight
	])
	let dimensions = {
		width: width,
		height: width,
		margin: {
			top: 60,
			right: 60,
			bottom: 80,
			left: 90,
		},
		legendWidth: width * 0.6,
		legendHeight: 20,
	}

	// on mobile
	if (isMobile.any()) {
		if (extra === "") {
			dimensions['legendWidth'] = width * .85
			dimensions['height'] = 1.5 * width
			dimensions['margin'] = {
					top: 50,
					right: 0,
					bottom: .5*width,
					left: 60,
			}
		} else {
			dimensions['height'] = 1.5 * width
			dimensions['margin'] = {
					top: 30,
					right: 0,
					bottom: .5*width,
					left: 30,
			}
		}
		
	}
	dimensions.boundedWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right
	dimensions.boundedHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom


	// 3. Draw Canvas
	var wrapper
	const pathsWrapperWidth = d3.select(`#${extra}paths-wrapper`).node().offsetWidth
	wrapper = d3.select(`#${extra}paths-wrapper`)
		.append("svg")
			.style("transform", `translate(${(pathsWrapperWidth - dimensions.width) / 2}px, ${0}px)`)
			.attr("width", dimensions.width)
			.attr("height", dimensions.height)
			.attr("class", `${extra}svg`)


	const bounds = wrapper.append("g")
		.style("transform", `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`)
		.attr("class", `${extra}bounds`)

	const boundsBackground = bounds.append("rect")
		.attr("class", "bounds-background")
		.attr("x", 0)
		.attr("width", dimensions.boundedWidth)
		.attr("y", 0)
		.attr("height", dimensions.boundedHeight)

	// 4. Create Scales
	const tileSize = dimensions.boundedWidth / NUM_GAMES - PADDING
	const xScale = d3.scaleLinear()
		.domain([0, NUM_GAMES])
		.range([0, dimensions.boundedWidth - tileSize])

	const yScale = d3.scaleLinear()
		.domain([0, NUM_GAMES])
		.range([dimensions.boundedHeight - tileSize, 0])

	const yearIntervals = getIntervalArray(START_YEAR, END_YEAR, INTERVAL)

	// 5. Draw Data
	const defaultTileData = getEmptyWinLossData()
	const tilesGroup = bounds.append("g")
	const tiles = tilesGroup.selectAll(".rect-tile")
		.data(defaultTileData, d => d[0])
		.join("rect")
			.attr("class", "rect-tile")
			.attr("height", tileSize)
  			.attr("width", tileSize)
			.attr("x", (d) => xScale(lossAccessor(d)) + PADDING / 2)
			.attr("y", (d) => yScale(winAccessor(d)) + PADDING / 2)
			.attr("id", (d,i) => `${extra}tile-${i}`)
			.attr("winPct", (d) => {
				const totalGames = lossAccessor(d) + winAccessor(d)
				if (totalGames > 0) {
					const winPct = 1.0 * winAccessor(d) / totalGames
					return winPct
				} else {
					return 0.5
				}
			})
			.style("fill", "#d8d8d8")
			.style("opacity", 0.5)
			.attr("rx", 0)
			.attr("ry", 0)
	const winLossGroup = bounds.append("g")
	const winsText = winLossGroup.append("text")
		.text("Wins")
		.attr("x", -12)
		.attr("y", -10)
		.attr("font-size", FONT_SIZE)
		.attr("text-anchor", "middle")
		.attr("fill", "#828282")
		.attr("id", `${extra}wins-text`)
		// .attr("opacity", 0.5)

	let lossesText = winLossGroup.append("text")
			.text("Losses")
			.attr("id", `${extra}losses-text`)
			.attr("x", dimensions.boundedWidth + 10)
			.attr("y", dimensions.boundedHeight + 17)
			.attr("font-size", FONT_SIZE)
			.attr("text-anchor", "start")
			.attr("alignment-baseline", "middle")
			.attr("fill", "#828282")

	// on desktop
	if (isMobile.any()) {
		d3.select("#losses-text").remove()
		lossesText = winLossGroup.append("text")
			.text("Losses")
			.attr("x", dimensions.boundedWidth / 2)
			.attr("y", dimensions.boundedHeight + 35)
			.attr("font-size", FONT_SIZE)
			.attr("text-anchor", "middle")
			.attr("alignment-baseline", "middle")
			.attr("fill", "#828282")
	}

	const winLossIntervals = getIntervalArray(GAME_TICK_INTERVAL, NUM_GAMES, GAME_TICK_INTERVAL)
	const winLabels = winLossGroup.selectAll(`.${extra}win-labels`)
		.data(winLossIntervals)
		.enter()
		.append("text")
			.text(d => d)
			.attr("class", `${extra}win-labels`)
			.attr("x", -15)
			.attr("y", win => yScale(win-0.5))
			.attr("font-size", FONT_SIZE)
			.attr("text-anchor", "middle")
			.attr("alignment-baseline", "middle")
			.attr("fill", "#828282")

	const lossLabels = winLossGroup.selectAll(`.loss-labels`)
		.data(winLossIntervals)
		.enter()
		.append("text")
			.text(d => d)
			.attr("class", `${extra}loss-labels`)
			.attr("x", loss => xScale(loss + 0.5))
			.attr("y", dimensions.boundedHeight + 17)
			.attr("font-size", FONT_SIZE)
			.attr("text-anchor", "middle")
			.attr("alignment-baseline", "middle")
			.attr("fill", "#828282")

	const zeroLabel = bounds.append("text")
		.text("0")
		.attr("x", -12)
		.attr("y", dimensions.boundedHeight + 17)
		.attr("font-size", FONT_SIZE)
		.attr("text-anchor", "start")
		.attr("alignment-baseline", "middle")
		.attr("fill", "#828282")

	return [wrapper, bounds, dimensions, tiles, tilesGroup, yearIntervals, xScale, yScale]
}

function substringMatcher(strs) {
	return function findMatches(q, cb) {
		// an array that will be populated with substring matches
		const matches = [];
		// regex used to determine if a string contains the substring `q`
		const substrRegex = new RegExp(q, 'i');
		// iterate through the pool of strings and for any string that
		// contains the substring `q`, add it to the `matches` array
		for (var i = 0; i < strs.length; i++) {
			const str = strs[i]
			if (substrRegex.test(str)) {
				matches.push(str);
			}
		}
		cb(matches);
	};
};


async function drawSeasonPaths(league) {
	const [wrapper, bounds, dimensions, tiles, tilesGroup, yearIntervals, xScale, yScale] = drawBaseTiles(league)
	const seasonData = await d3.json(`/assets/data/${league}_season_paths.json`)
	const teamData = await d3.json(`/assets/data/${league}_teams.json`)
	const teams = Object.keys(teamData)
	
	// bounds.on("mousemove", onMouseMove)

	// function onMouseMove(e) {
	// 	const [x, y] = d3.mouse(this)
	// 	const mouseLosses = Math.round(xScale.invert(x))
	// 	const mouseWins = Math.round(yScale.invert(y))
	// 	const mouseTotal = mouseLosses + mouseWins
	// 	let timer;
	//     let fadeInBuffer = false;
	// 	if (mouseLosses > 0 && mouseWins > 0 && mouseTotal <= NUM_GAMES) {
	// 		if (!fadeInBuffer && timer) {
	// 			clearTimeout(timer);
	// 			timer = 0;
	// 			d3.select('html').style("cursor", "none")
	// 		} else {
	// 			bounds.style("cursor", "default")
	// 			fadeInBuffer = false;
	// 		}
	// 		timer = setTimeout(function() {
	// 			bounds.style("cursor", "none")
	// 			fadeInBuffer = true;
	// 		}, 1000)
	// 	} else {
	// 		clearTimeout(timer);
	// 		timer = 0;
	// 		fadeInBuffer = false;
	// 		bounds.style("cursor", "default")
	// 	}
	// }

	$('.typeahead').on('focus', function() {
	    $(this).parent().siblings().addClass('active');
	}).on('blur', function() {
	    if (!$(this).val()) {
	        $(this).parent().siblings().removeClass('active');
	    }
	});

	$('#basketball-team-input').typeahead({
		hint: true,
		highlight: true,
		minLength: 0
	},
	{
		name: 'teams',
		limit: 200,
		source: substringMatcher(teams)
	});


	const suggestionGroup = d3.selectAll(".suggestion")
	suggestionGroup.on("click", onSuggestionClick)
	// d3.select("#autocomplete").on("keydown", onAutocompleteKeydown)

	function onSuggestionClick(e, suggestionIndex) {
		const suggestionItem = d3.select(suggestionGroup.nodes()[suggestionIndex])
		const suggestion = suggestionItem.attr("value")
		const suggestionDecade = parseInt(suggestionItem.attr("decade"))
		d3.select("#basketball-autocomplete").attr("autocomplete", "on")
		$("#basketball-autocomplete").val(suggestion)
		DEFAULT_TEAM = suggestion
    	d3.selectAll("#graphic-wrapper > *").remove();
    	setConfig()
    	d3.select("#basketball-team-input").property('value', suggestion)
    	$('#basketball-team-input').typeahead('val', suggestion);

    	IS_DEFAULT_CLICK = true
  		drawSeasonPathsByTeam(league, DEFAULT_TEAM, seasonData, teamData, wrapper, bounds, dimensions, tiles, tilesGroup, yearIntervals, xScale, yScale, suggestionDecade)
  		// d3.select(".pac-container").style("height", 0)
	}


	d3.select("#nba-autocomplete")
		.style("transform", `translate(${dimensions.width / 4}px, ${dimensions.margin.top / 2}px)`)

	drawSeasonPathsByTeam(league, "", seasonData, teamData, wrapper, bounds, dimensions, tiles, tilesGroup, yearIntervals, xScale, yScale)
		d3.select(".typeahead")
		.style("border", `1px solid #828282`)
		.style("border-radius", '30px')
	d3.select("#basketball-team-input")
		.style("color", '#828282')
	d3.select("#nba-autocomplete")
		.style("display", "block")
	d3.select("#basketball-team-input")
		.property('value', "Choose your team")
	$('#basketball-team-input').on('typeahead:selected', function (e, team) {
		drawSeasonPathsByTeam(league, team, seasonData, teamData, wrapper, bounds, dimensions, tiles, tilesGroup, yearIntervals, xScale, yScale)
		DEFAULT_TEAM = team
		d3.select("#basketball-team-input").property('value', DEFAULT_TEAM)
	});
}

function highlightLine(lineId, animationTime, lineColor) {
	const lineIdString = `#${lineId}`
	d3.select(lineIdString)
		.transition(`highlight-line-${lineIdString}`)
		.duration(animationTime)
		.attr("stroke", lineColor)
		.style("opacity", 1)
}

function fadeLine(lineId, animationTime, opacity=0) {
	const lineIdString = `#${lineId}`
	d3.select(lineIdString)
		.transition(`fade-line-${lineIdString}`)
		.duration(animationTime)
		.style("opacity", opacity)
}

function animateLine(lineId, animationTime, lineColor) {
	const lineIdString = `#${lineId}`
	const totalLength = d3.select(lineIdString).node().getTotalLength();

	d3.select(lineIdString)
		.attr("stroke", lineColor)
		.style("opacity", 1)
		// Set the line pattern to be an long line followed by an equally long gap
		.attr("stroke-dasharray", totalLength + " " + totalLength)
		// Set the intial starting position so that only the gap is shown by offesetting by the total length of the line
		.attr("stroke-dashoffset", totalLength)
		// Then the following lines transition the line so that the gap is hidden...
		.transition(`draw-line-${lineIdString}`)
		.duration(animationTime)
		.style("fill-opacity", 1)
		.ease(d3.easeSin)
		.attr("stroke-dashoffset", 0)
		.end()
}


function randomizeBetweenTwoNumbers(min, max){
	const randomNumber = (Math.floor(Math.random()*(max-min+1)+min))
	return randomNumber;
}

async function drawSeasonPathsByTeam(league, team, seasonData, teamData, wrapper, bounds, dimensions, tiles, tilesGroup, yearIntervals, xScale, yScale, decade=null) {
	bounds.selectAll(".season-path").remove()
	bounds.selectAll(".voronoi").remove()
	bounds.selectAll(".season-label").remove()
	bounds.selectAll(".legend-tile").remove()
	bounds.selectAll(".legend-value").remove()
	bounds.selectAll(".bookend-legend-tile").remove()
	bounds.selectAll(".championship-star").remove()
	bounds.selectAll(".record-label").remove()
	bounds.selectAll(".best-label").remove()
	bounds.selectAll(".overall-label").remove()
	bounds.selectAll(".worst-label").remove()
	wrapper.selectAll(".team-logo").remove()
	wrapper.selectAll(".team-logo-label").remove()

	// 5. Draw Data
	// Plotting Season Paths
	const filterTeam = team
	const filteredCumulativeSeasons = seasonData[filterTeam]['cumulative_seasons']
	const seasonsData = seasonData[filterTeam]['seasons']
	const seasons = Object.keys(seasonsData)
	const seasonIntervals = getIntervalArray(seasons[0], seasons[seasons.length - 1], INTERVAL)
	const seasonLineGenerator = d3.line()
		.x(d => xScale(lossAccessor(d)) + (dimensions.boundedWidth / NUM_GAMES) / 2)
		.y(d => yScale(winAccessor(d)) + (dimensions.boundedWidth / NUM_GAMES) / 2)

	const primaryColor = teamData[filterTeam]['primary_color']
	const secondaryColor = teamData[filterTeam]['secondary_color']
	d3.select("#basketball-team-input")
		.style("color", primaryColor)
	d3.select("#nba-autocomplete")
		.style("display", "block")
	// d3.select(".autocomplete")
	// 	.style("border", `1px solid ${secondaryColor}`)
	// 	.style("border-radius", '30px')
	d3.select(".typeahead")
		.style("border", `1px solid ${secondaryColor}`)
		.style("border-radius", '30px')

	const numTeamColors = yearIntervals.length
	const primaryTeamColors = makeColors(primaryColor, 0, numTeamColors, 0.8)
	const secondaryTeamColors = makeColors(secondaryColor, 0, numTeamColors, 0.8)
	const primaryTeamColorScale = d3.scaleThreshold()
  		.domain(yearIntervals)
  		.range(primaryTeamColors);
	const secondaryTeamColorScale = d3.scaleThreshold()
  		.domain(yearIntervals)
  		.range(secondaryTeamColors);



	// 6. Draw Peripherals
	// Define legend
	const fillerLegendGroup = bounds.append("g")
	const legendGroup = bounds.append("g")
	const legendTileWidth = Math.min(dimensions.legendWidth / yearIntervals.length, dimensions.legendWidth / 9)
	let legendY = dimensions.boundedHeight + 35
	let legendX = 0
	let legendXPadding = 10
	let legendFontSize = 12
	if (isMobile.any()) {
		legendY = dimensions.boundedHeight + 60
		legendX = -dimensions.margin.left
		legendXPadding = 5
		legendFontSize = FONT_SIZE
	}

	const legendXRange = Array.from({length: yearIntervals.length}, (_, n) => legendX + (n)*(legendTileWidth+legendXPadding))
	const legendXScale = d3.scaleLinear()
		.domain(d3.extent(yearIntervals))
		.range(d3.extent(legendXRange))

	const grayColors = makeColors("#d8d8d8")
	const grayContinuousScale  = d3.scaleLinear()
 		.domain(yearIntervals)
		.range(grayColors)
		.interpolate(d3.interpolateRgb);

	const firstYear = parseInt(seasons[0])
	const lastYear = parseInt(seasons[seasons.length - 1])

	const fillerIntervals = yearIntervals.filter(d => !seasonIntervals.includes(d))
	const fillerTiles = fillerLegendGroup.selectAll(".rect")
	  .data(fillerIntervals)
	  .enter()
	  .append("rect")
	    .attr("class", "legend-tile")
	    .attr("x", d => legendXScale(d)) 
	    .attr("y", legendY) // 100 is where the first dot appears. 25 is the distance between dots
	    .attr("width", legendTileWidth)
	    .attr("height", dimensions.legendHeight)
	    .style("fill", d => "#d8d8d8")
	    .style("opacity", 0.5)

	const fillerLabels = fillerLegendGroup.selectAll(".text")
	  .data(fillerIntervals)
	  .enter()
	  .append("text")
	  	.attr("class", "legend-value")
	    .attr("x", d => legendXScale(d) + legendTileWidth / 2 )
	    .attr("y", legendY + dimensions.legendHeight + 10)
	    .style("fill", d => "#d8d8d8")
	    .text(d => `${d}s`)
	    .attr("text-anchor", "middle")
	    .style("alignment-baseline", "middle")
	    .style("font-size", legendFontSize)	

	const legendTiles = legendGroup.selectAll(".legend-tile")
	  .data(seasonIntervals)
	  .enter()
	  .append("rect")
	    .attr("class", "legend-tile")
	    // .attr("x", d => legendXScale(d))
	    .attr("x", d => {
	    	if (firstYear >= d && firstYear <= (d + INTERVAL - 1)) {
	    		return legendXScale(d) + legendTileWidth * ((firstYear - d) / INTERVAL)
	    	}
	    	return legendXScale(d)
	    })
	    .attr("y", legendY) // 100 is where the first dot appears. 25 is the distance between dots
	    // .attr("width", legendTileWidth)
	    .attr("width", (d) => {
	    	if (firstYear >= d && firstYear <= (d + INTERVAL - 1)) {
	    		let multiplier = 1 - (firstYear - d) / INTERVAL
	    		if (lastYear >= d && lastYear <= (d + INTERVAL - 1)) {
	    			multiplier = (lastYear - firstYear + 1) / INTERVAL
	    		}
	    		return legendTileWidth * multiplier
	    	}
	    	if (lastYear >= d && lastYear <= (d + INTERVAL - 1)) {
	    		const multiplier = (lastYear - d + 1) / INTERVAL
	    		return legendTileWidth * multiplier
	    	}
	    	return legendTileWidth
	    })
	    .attr("height", dimensions.legendHeight)
	    .style("fill", d => primaryTeamColorScale(d))
	    .style("opacity", 1)

	const bookendYears = [seasonIntervals[0], seasonIntervals[seasonIntervals.length - 1]]
	const bookendTiles = legendGroup.selectAll(".bookend-legend-tile")
		.data(bookendYears)
		.enter()
		.append("rect")
			.attr("class", "bookend-legend-tile")
			.attr("x", (d,i) => {
		    	if (i === 1 && lastYear >= d && lastYear <= (d + INTERVAL - 1)) {
		    		return legendXScale(d) + legendTileWidth * ((lastYear + 1 - d) / INTERVAL)
		    	}
		    	return legendXScale(d)
		    })
		    .attr("y", legendY)
		    .attr("width", (d, i) => {
	    		if (firstYear >= d && firstYear <= (d + INTERVAL - 1)) {
	    			let multiplier = 1 - (firstYear - d) / INTERVAL
		    		if (i === 1 && lastYear >= d && lastYear <= (d + INTERVAL - 1)) {
		    			multiplier = (lastYear - d + 1) / INTERVAL
		    		}
		    		return legendTileWidth - legendTileWidth * multiplier
		    	}
		    	if (i === 1 && lastYear >= d && lastYear <= (d + INTERVAL - 1)) {
		    		const multiplier = (lastYear - d + 1) / INTERVAL
		    		return legendTileWidth - legendTileWidth * multiplier
		    	}
	    		return legendTileWidth
	    })
	    .attr("height", dimensions.legendHeight)
	    .style("fill", "#d8d8d8")
	    .style("opacity", 0.5)

	const legendLabels = legendGroup.selectAll(".legend-value")
	  .data(seasonIntervals)
	  .enter()
	  .append("text")
	  	.attr("class", "legend-value")
	    .attr("x", d => legendXScale(d) + legendTileWidth / 2)
	    .attr("y", legendY + dimensions.legendHeight + 10)
	    .style("opacity", 1)
	    .style("fill", d => primaryColor)
	    .text(d => {
	    	// let labelYear = d
	    	// if (firstYear >= d && firstYear <= (d + INTERVAL - 1)) {
	    	// 	if (lastYear >= d && lastYear <= (d + INTERVAL - 1)) {
	    	// 		if (firstYear == lastYear) {
	    	// 			return `${firstYear}`
	    	// 		}
	    	// 		return `${firstYear} - ${lastYear}`
	    	// 	}
	    	// 	return `${firstYear}`
	    	// } else if (lastYear >= d && lastYear <= (d + INTERVAL - 1)) {
	    	// 	return `${lastYear}`
	    	// }
	    	return `${d}s`
	    })
	    .attr("text-anchor", "middle")
	    .style("alignment-baseline", "middle")
	    .style("font-size", legendFontSize)	

	legendLabels.style("opacity", 1).style("stroke", d => primaryTeamColorScale(d))

	let orderedTeamHistory = teamData[filterTeam]['history'] === 0 ? [filterTeam] : JSON.parse(teamData[filterTeam]['history'])
	const teamParent = teamData[filterTeam]['parent']
	if (![0, 'deprecated'].includes(teamParent)) {
		orderedTeamHistory =  JSON.parse(teamData[teamParent]['history'])
	}

	let logoShift = 20
	let logoSize = 55
	let logoY = -15
	let logoFontSize = 10
	if (isMobile.any()) {
		logoSize = 25
		logoShift = 25
		logoY = -15
		logoFontSize = 6
	}
	
	const logoPadding = 25
	const logoFade = 0.4
	
	const logo = bounds.selectAll(".team-logo")
		.data(orderedTeamHistory)
		.enter()
		.append("svg:image")
			.attr("class", "team-logo")
			.attr("xlink:href", team => `/assets/images/logos/${league}/${team}.png`)
			.attr("width", logoSize)
			.attr("height", logoSize)
			.attr("x", -dimensions.margin.left + logoShift / 2 - 10)
			.attr("y", (d,i) => logoY + (i) * (logoSize + logoPadding))
			.attr("opacity", d => {
				if (d === filterTeam) {
					return 1
				} else {
					return logoFade
				}

			})
			.style('filter', d => {
				if (d !== filterTeam) {
					return 'url(#grayscale)'
				}
				return
			})

	const logoLabel = bounds.selectAll(".team-logo-label")
		.data(orderedTeamHistory)
		.enter()
		.append("text")
			.text(d => {
				const logoSeasons = Object.keys(seasonData[d]['seasons'])
				const logoStartYear = logoSeasons[0]
				const logoEndYear = parseInt(logoSeasons[logoSeasons.length - 1]) === END_YEAR ? "Now" : logoSeasons[logoSeasons.length - 1]
				if (logoStartYear === logoEndYear) {
					return logoStartYear
				}
				return `${logoStartYear} - ${logoEndYear}`
			})
			.attr("class", "team-logo-label")
			.attr("x", -dimensions.margin.left + logoShift / 2 + logoSize / 2 - 10)
			.attr("y", (d,i) =>  logoY + (i + 1) * (logoSize + logoPadding) - logoPadding * .6)
			.attr("text-anchor", "middle")
			.style("font-size", logoFontSize)	
			.attr("opacity", d => {
				if (d === filterTeam) {
					return 1
				} else {
					return logoFade
				}
			})
			.attr("fill", d => {
				if (d === filterTeam) {
					return "black" // teamData[d]['primary_color']
				} else {
					return "d8d8d8"
				}
			})

	let hoverPct = .75
	let hoverFontSize = 30
	let hoverFontSizeSmall = 18
	let hoverGapY = 30
	if (isMobile.any()) {
		hoverPct = .65
		hoverFontSize = 15
		hoverFontSizeSmall = 12
		hoverGapY = 20
	}
	const hoverStartingPointX = dimensions.width / 2 - dimensions.margin.left
	const hoverWin = bounds.append("text")
		.text('0')
		.attr("class", "record-label")
		.attr("x", hoverStartingPointX - 14.5)
		.attr("y", -10)
		.attr("text-anchor", "end")
		.style("font-size", hoverFontSize)
		.style("fill", primaryColor)
		.style("opacity", 0)
	const hoverHyphen = bounds.append("text")
		.text('-')
		.attr("class", "record-label")
		.attr("x", hoverStartingPointX)
		.attr("y", -10)
		.attr("text-anchor", "middle")
		.style("font-size", hoverFontSize)
		.style("fill", primaryColor)
		.style("opacity", 0)
	const hoverLoss = bounds.append("text")
		.text('0')
		.attr("class", "record-label")
		.attr("x", hoverStartingPointX + 14.5)
		.attr("y", -10)
		.attr("text-anchor", "start")
		.style("font-size", hoverFontSize)
		.style("fill", primaryColor)
		.style("opacity", 0)
	const hoverWinPct = bounds.append("text")
		.text('0')
		.attr("class", "record-label")
		.attr("x", hoverStartingPointX)
		.attr("y", -10 + hoverGapY)
		.attr("text-anchor", "middle")
		.style("font-size", hoverFontSizeSmall)
		.style("fill", primaryColor)
		.style("opacity", 0)





  	const seasonLines = []
  	const seasonLinesFormatted = {}
  	const seasonPathIds = []
  	for (var i = 0; i < seasons.length; i++) {
  		const season = seasons[i]
  		const seasonLineFormatted = formatSeasonToDrawPath(seasonsData[season], xScale)
  		const seasonLine = seasonLineGenerator(seasonLineFormatted)
  		const seasonPathId = Math.round(seasons[i])
  		
  		seasonLines.push(seasonLine)
  		seasonLinesFormatted[season] = seasonLineFormatted
  		seasonPathIds.push(`season-path-${seasonPathId.toString()}`)
  	}


	function getWinPctFromWinsAndLosses(wins, losses) {
		let winPct = (wins+losses) > 0 ? ((Math.round(1000.0 * wins/(wins+losses))) / 1000).toFixed(3).toString() : ''
		if (winPct.startsWith('0.')) {
			return '.' + winPct.split('0.')[1]
		}
		return winPct
	}

  	function getRecordDataFromSeasons(years, seasonsData) {
  		let overallWins = 0
  		let overallLosses = 0
  		let overallNumYears = 0

  		let bestYear
  		let bestWins = 0
  		let bestLosses = 0
  		let bestWinPct = 0

  		let worstYear
  		let worstWins = 0
  		let worstLosses = 0
  		let worstWinPct = 1

  		for (var i = 0; i < years.length; i++) {
  			let year = years[i]
  			if (typeof(year) === 'number') {
  				year = year.toString()
			}
  			if (year in seasonsData) {
  				const season = seasonsData[year]
  				const sortedKeys = Object.keys(season).sort()
				const lastEntry = season[sortedKeys[sortedKeys.length - 1]]
				const lastEntryWins = lastEntry['win']
				const lastEntryLosses = lastEntry['loss']
				const winPct = getWinPctFromWinsAndLosses(lastEntryWins, lastEntryLosses)
				if (winPct > bestWinPct) {
					bestYear = year
					bestWins = lastEntryWins
					bestLosses = lastEntryLosses
					bestWinPct = winPct
				}
				if (winPct < worstWinPct) {
					worstYear = year
					worstWins = lastEntryWins
					worstLosses = lastEntryLosses
					worstWinPct = winPct
				}

				overallNumYears += 1
				overallWins += lastEntry['win']
				overallLosses += lastEntry['loss']
  			}
  		}

  		const recordData = {
  			'overall': {
  				'wins': overallWins,
  				'losses': overallLosses,
  				'win_pct': getWinPctFromWinsAndLosses(overallWins, overallLosses),
  				'num_years': overallNumYears
  			},
  			'best': {
  				'wins': bestWins,
  				'losses': bestLosses,
  				'win_pct': bestWinPct,
  				'year': bestYear
  			},
  			'worst': {
  				'wins': worstWins,
  				'losses': worstLosses,
  				'win_pct': worstWinPct,
  				'year': worstYear
  			}
  		}

  		return recordData
  	}

  	const recordData = getRecordDataFromSeasons(seasons, seasonsData)


  	let recordFontSize = 17
  	let recordFontSizeSmall = 15
  	let recordSpacingX = 10.5
  	let recordSpacingY = 25
  	let recordStartingPointY = -10
  	let recordSectionSpacing = 30
	let overallPct = .75
	if (isMobile.any()) {
		overallPct = .65
		recordFontSize = 1.1*FONT_SIZE
		recordFontSizeSmall = 10
		recordSpacingX = 7
		recordSpacingY = 12
		recordStartingPointY = -10
		recordSectionSpacing = 15
	}
	const overallStartingPointX = dimensions.boundedWidth * overallPct
	const overallStartingPointY = recordStartingPointY
	const overallSpacing = recordSpacingX

	const overallWins = recordData['overall']['wins']
	const overallLosses = recordData['overall']['losses']
	const overallWinPct = recordData['overall']['win_pct']
	const overallNumYears = recordData['overall']['num_years']

	const overallWin = bounds.append("text").text(overallWins).attr("class", "overall-label").attr("id","overall-win").attr("x", overallStartingPointX).attr("y", overallStartingPointY + recordSpacingY).attr("text-anchor", "end").style("font-size", recordFontSize).style("fill", "black").style("opacity", 0)
	const overallWinWidth = d3.select("#overall-win").node().getBoundingClientRect().width

	const overallHyphen = bounds.append("text").text('-').attr("class", "overall-label").attr("x", overallStartingPointX + overallSpacing).attr("y", overallStartingPointY + recordSpacingY).attr("text-anchor", "middle").style("font-size", recordFontSize).style("fill", "black").style("opacity", 0)
	const overallLoss = bounds.append("text").text(overallLosses).attr("class", "overall-label").attr("id", "overall-loss").attr("x", overallStartingPointX + 2*overallSpacing).attr("y", overallStartingPointY + recordSpacingY).attr("text-anchor", "start").style("font-size", recordFontSize).style("fill", "black").style("opacity", 0)
	const overallLossWidth = d3.select("#overall-loss").node().getBoundingClientRect().width
	const overallWinPctLabel = bounds.append("text").text(`${overallWinPct}`).attr("class", "overall-label").attr("id","overall-win-pct").attr("id", "overall-win-pct").attr("x", overallStartingPointX + overallSpacing).attr("y", overallStartingPointY + 2*recordSpacingY).attr("text-anchor", "middle").style("font-size", recordFontSizeSmall).style("fill", "black").style("opacity", 0)
	
	const overallWinBBox = d3.select("#overall-win").node().getBBox()
	const overallMidpoint = overallStartingPointX + overallSpacing // overallWinBBox.x + ((overallWinPctBBox.x + overallWinPctBBox.width) - overallWinBBox.x) / 2
	
  	const overallText = bounds.append("text").text(overallNumYears > 1 ? `Overall (${overallNumYears} yrs.)` : `Overall (${overallNumYears} yr.)`).attr('text-decoration', 'underline').attr("id","overall-text").attr("class", "overall-label").attr("x", overallMidpoint).attr("y", overallStartingPointY).attr("text-anchor", "middle").style("font-size", recordFontSize).style("fill", "#5F5F5F").style("opacity", 0)
	const overallTextBBox = d3.select("#overall-text").node().getBBox()

	let bestPct = .75
	if (isMobile.any()) {
		bestPct = .65
	}
	const bestStartingPointX = dimensions.boundedWidth * bestPct
	const bestStartingPointY = overallStartingPointY + 3*recordSpacingY + recordSectionSpacing
	const bestSpacing = recordSpacingX

	const bestWins = recordData['best']['wins']
	const bestLosses = recordData['best']['losses']
	const bestWinPct = recordData['best']['win_pct']
	const bestYear = recordData['best']['year']

	const bestWin = bounds.append("text").text(bestWins).attr("class", "best-label").attr("id","best-win").attr("x", bestStartingPointX).attr("y", bestStartingPointY + recordSpacingY).attr("text-anchor", "end").style("font-size", recordFontSize).style("fill", "#1a9850").style("opacity", 0)
	const bestWinWidth = d3.select("#best-win").node().getBoundingClientRect().width
	const bestText = bounds.append("text").text(`Best (${bestYear})`).attr('text-decoration', 'underline').attr("class", "best-label").attr("id","best-text").attr("x", overallMidpoint).attr("y", bestStartingPointY).attr("text-anchor", "middle").style("font-size", recordFontSize).style("fill", "#5F5F5F").style("opacity", 0)

	const bestHyphen = bounds.append("text").text('-').attr("class", "best-label").attr("x", bestStartingPointX + bestSpacing).attr("y", bestStartingPointY + recordSpacingY).attr("text-anchor", "middle").style("font-size", recordFontSize).style("fill", "#1a9850").style("opacity", 0)
	const bestLoss = bounds.append("text").text(bestLosses).attr("class", "best-label").attr("id", "best-loss").attr("x", bestStartingPointX + 2*bestSpacing).attr("y", bestStartingPointY + recordSpacingY).attr("text-anchor", "start").style("font-size", recordFontSize).style("fill", "#1a9850").style("opacity", 0)
	const bestLossWidth = d3.select("#best-loss").node().getBoundingClientRect().width
	const bestWinPctLabel = bounds.append("text").text(`${bestWinPct}`).attr("class", "best-label").attr("id","best-win-pct").attr("x", overallMidpoint).attr("y", bestStartingPointY + 2*recordSpacingY).attr("text-anchor", "middle").style("font-size", recordFontSizeSmall).style("fill", "#1a9850").style("opacity", 0)
  	
	let worstPct = .75
	if (isMobile.any()) {
		worstPct = .65
	}
	const worstStartingPointX = dimensions.boundedWidth * worstPct
	const worstStartingPointY = overallStartingPointY + 6*recordSpacingY + 2*recordSectionSpacing
	const worstSpacing = recordSpacingX

	const worstWins = recordData['worst']['wins']
	const worstLosses = recordData['worst']['losses']
	const worstWinPct = recordData['worst']['win_pct']
	const worstYear = recordData['worst']['year']

	const worstWin = bounds.append("text").text(worstWins).attr("class", "worst-label").attr("id","worst-win").attr("x", worstStartingPointX).attr("y", worstStartingPointY + recordSpacingY).attr("text-anchor", "end").style("font-size", recordFontSize).style("fill", "#d73027").style("opacity", 0)
	const worstWinWidth = d3.select("#worst-win").node().getBoundingClientRect().width
	const worstText = bounds.append("text").text(`Worst (${worstYear})`).attr('text-decoration', 'underline').attr("class", "worst-label").attr("id","worst-text").attr("x", overallMidpoint).attr("y", worstStartingPointY).attr("text-anchor", "middle").style("font-size", recordFontSize).style("fill", "#5F5F5F").style("opacity", 0)

	const worstHyphen = bounds.append("text").text('-').attr("class", "worst-label").attr("x", worstStartingPointX + worstSpacing).attr("y", worstStartingPointY + recordSpacingY).attr("text-anchor", "middle").style("font-size", recordFontSize).style("fill", "#d73027").style("opacity", 0)
	const worstLoss = bounds.append("text").text(worstLosses).attr("class", "worst-label").attr("id", "worst-loss").attr("x", worstStartingPointX + 2*worstSpacing).attr("y", worstStartingPointY + recordSpacingY).attr("text-anchor", "start").style("font-size", recordFontSize).style("fill", "#d73027").style("opacity", 0)
	const worstLossWidth = d3.select("#worst-loss").node().getBoundingClientRect().width
	const worstWinPctLabel = bounds.append("text").text(`${worstWinPct}`).attr("class", "worst-label").attr("id","worst-win-pct").attr("x", overallMidpoint).attr("y", worstStartingPointY + 2*recordSpacingY).attr("text-anchor", "middle").style("font-size", recordFontSizeSmall).style("fill", "#d73027").style("opacity", 0)

	const xTransform = (dimensions.boundedWidth + dimensions.margin.right) - (overallTextBBox.x + overallTextBBox.width) - 2
	d3.selectAll(".overall-label").attr("transform", `translate(${xTransform}, ${0})`).style("opacity", 1)
	d3.selectAll(".best-label").attr("transform", `translate(${xTransform}, ${0})`).style("opacity", 1)
	d3.selectAll(".worst-label").attr("transform", `translate(${xTransform}, ${0})`).style("opacity", 1)

  	const seasonPaths = bounds.selectAll(".path")
		.data(seasons)
		.enter()
		.append("path")
			.attr("class", "season-path")
			.attr("fill", "none")
			.attr("opacity", 0)
			.attr("stroke", d => primaryTeamColorScale(d)) // year
			.attr("stroke-width", dimensions.boundedWidth / NUM_GAMES - PADDING)
			.attr("id", d => {
				return `season-path-${Math.round(d).toString()}`
			})
			.attr("d", (d,i) => seasonLines[i]) // season

    
    d3.selectAll('.season-path')
		.style("opacity", 1)


	const championshipSeasons = seasonData[filterTeam]['championship_seasons']
	const seasonLabelPositionTaken = {}
	const seasonLabels = bounds.selectAll(".season-label")
		.data(seasons)
		.enter()
		.append("text")
			.attr("class", "season-label")
			.attr("x", (d,i) => {
				const seasonArray = seasonLinesFormatted[d]
				const finalRecordLosses = lossAccessor(seasonArray[seasonArray.length - 1])
				return xScale(finalRecordLosses + 0.5) + 25
			})
			.attr("y", (d,i) => {
				const seasonArray = seasonLinesFormatted[d]
				const finalRecordWins = winAccessor(seasonArray[seasonArray.length - 1])
				return yScale(finalRecordWins) - 5
			})			
			.text(d => `${d}`)
			.style("opacity", 0)
			.style("fill", d => "black")
			.attr("text-anchor", "end")
			.style("alignment-baseline", "middle")
			.style("font-size", 10)	
			// .attr("stroke-opacity", )

	const championshipLabels = seasonLabels.filter(d => championshipSeasons.includes(parseInt(d)))
	championshipLabels.style("opacity", 1)
	
	const championshipStarSize = 40
	const championshipStars = bounds.selectAll(".championship-star")
		.data(championshipSeasons)
  		.enter()
		.append("g")
			.attr("class", "championship-star")
			.attr("transform", season => {
				const seasonArray = formatSeasonToDrawPath(seasonsData[season], xScale)
				const finalRecordLosses = lossAccessor(seasonArray[seasonArray.length - 1])
				const finalRecordWins = winAccessor(seasonArray[seasonArray.length - 1])
				const x = xScale(finalRecordLosses + 0.5) + 35
				const y = yScale(finalRecordWins) - 7
				return `translate(${x},${y})`
			})
			.attr("fill", "black")
			.attr("stroke-width", 1)
		.append("path")
			.attr("d", function(d) {return d3.symbol().type(d3.symbolStar).size(championshipStarSize)()})
			.attr("stroke", d => secondaryTeamColorScale(d))
			.style("fill", d => primaryTeamColorScale(d))
			.style("opacity", 1)



	const hoverSquare = bounds.append("rect")
		.attr("class", "rect")
		.attr("height", dimensions.boundedWidth / NUM_GAMES - PADDING)
		.attr("width", dimensions.boundedWidth / NUM_GAMES - PADDING)
		.attr("fill", "transparent")
		.attr("x", 0)
		.attr("y", 0)
		.style("opacity", 0)
		.style("stroke", "white")
		.style("stroke-width", "1.5px")





	// // 7. Create Interactions
	const legendFade = 0.25
	let seasonFade = 0.05
	let seasonSemiFade = 0.25

	if (seasons.length < 15) {
		seasonFade = 0.1
		seasonSemiFade = 0.35
	}

	let intervalStart, intervalEnd

	let filteredRecordData
	let filteredSeasons = {'_groups': [[]]}
	let filteredSeasonLabels = {'_groups': [[]]}
	let filteredChampionshipStars = {'_groups': [[]]}

	let matchingSeasons = {'_groups': [[]]}
	let matchingSeasonLabels = {'_groups': [[]]}
	let matchingChampionshipStars = {'_groups': [[]]}


	logo.on("click", onLogoMouseClick)
	function onLogoMouseClick(clickedTeam) {
		if (clickedTeam !== filterTeam) {
			const basketballTeamInput = d3.select("#basketball-team-input")
			basketballTeamInput.property("value", clickedTeam);
    		$('#basketball-team-input').typeahead('val', clickedTeam);
			drawSeasonPathsByTeam(league, clickedTeam, seasonData, teamData, wrapper, bounds, dimensions, tiles, tilesGroup, yearIntervals, xScale, yScale)
		}
	}

	legendGroup.on("click", onLegendMouseClick)
	drawVoronoi(seasons, seasonsData, seasonLinesFormatted, xScale, yScale, dimensions, bounds, onSeasonPathMouseEnter, onSeasonPathMouseLeave, onSeasonPathMouseMove)
	
	function onSeasonPathMouseMove(datum) {
		const [x, y] = d3.mouse(this)
		const mouseLosses = Math.round(xScale.invert(x))
		const mouseWins = Math.round(yScale.invert(y))
		const mouseWinPct = getWinPctFromWinsAndLosses(mouseWins, mouseLosses)
		const mouseTotal = mouseLosses + mouseWins
		if (mouseTotal > 1.15 * NUM_GAMES) {
			if (filteredSeasons._groups[0].length > 0) {
				filteredSeasons.style("opacity", 1)
				filteredSeasonLabels.style("opacity", 1)
				filteredChampionshipStars.style("opacity", 1)
			} else {
				seasonPaths.style("opacity", 1)
				seasonLabels.style("opacity", 0)
				championshipStars.style("opacity", 1)
				championshipLabels.style("opacity", 1)
			}
			hoverSquare.style("opacity", 0)
			hoverWin.text(mouseWins).style("opacity", 0)
			hoverHyphen.style("opacity", 0)
			hoverLoss.text(mouseLosses).style("opacity", 0)
			hoverWinPct.text(mouseWinPct).style("opacity", 0)

		} else if (mouseTotal <= 1.15 * NUM_GAMES && mouseTotal > NUM_GAMES) {
			if (matchingSeasons._groups[0].length > 0) {
				hoverSquare.style("opacity", 1)
				if (filteredSeasons._groups[0].length > 0) {
					filteredSeasons.style("opacity", seasonSemiFade)
					filteredSeasonLabels.style("opacity", seasonSemiFade)
					filteredChampionshipStars.style("opacity", seasonSemiFade)
					matchingSeasons.style("opacity", 1)
					matchingSeasonLabels.style("opacity", 1)
					matchingChampionshipStars.style("opacity", 1)
				} else {
					seasonPaths.style("opacity", seasonFade)
					championshipStars.style("opacity", seasonFade)
					championshipLabels.style("opacity", seasonFade)
					matchingSeasons.style("opacity", 1)
					matchingSeasonLabels.style("opacity", 1)
					matchingChampionshipStars.style("opacity", 1)
				}
			}
		}
	}

	function onSeasonPathMouseEnter(datum) {
		const losses = Math.round(xScale.invert(datum[0]))
		const wins = Math.round(yScale.invert(datum[1]))
		const winPct = getWinPctFromWinsAndLosses(wins, losses)
		const matchingYears = getMatchingYearsFromWinsAndLosses(wins, losses, seasons, seasonsData)

		hoverSquare
			.attr("transform", `translate(${xScale(losses) + PADDING / 2}, ${yScale(wins) + PADDING / 2})`)
			.style("opacity", 1)

		hoverWin.text(wins).style("opacity", 1)
		hoverHyphen.style("opacity", 1)
		hoverLoss.text(losses).style("opacity", 1)
		hoverWinPct.text(winPct).style("opacity", 1)

		if (filteredSeasons._groups[0].length > 0) {
			matchingSeasons = filteredSeasons.filter(d => matchingYears.includes(parseInt(d)))
			matchingSeasonLabels = filteredSeasonLabels.filter(d => matchingYears.includes(parseInt(d)))
			matchingChampionshipStars = filteredChampionshipStars.filter(d => matchingYears.includes(parseInt(d)))
			if(matchingSeasons._groups[0].length > 0) {
				filteredSeasons.style("opacity", seasonSemiFade)
				filteredSeasonLabels.style("opacity", seasonSemiFade)
				filteredChampionshipStars.style("opacity", seasonSemiFade)
				matchingSeasons.style("opacity", 1)
				matchingSeasonLabels.style("opacity", 1)
				matchingChampionshipStars.style("opacity", 1)
			}
		} else {
			matchingSeasons = seasonPaths.filter(d => matchingYears.includes(parseInt(d)))
			matchingSeasonLabels = seasonLabels.filter(d => matchingYears.includes(parseInt(d)))
			matchingChampionshipStars = championshipStars.filter(d => matchingYears.includes(parseInt(d)))
			seasonPaths.style("opacity", seasonFade)
			championshipStars.style("opacity", seasonFade)
			championshipLabels.style("opacity", seasonFade)
			matchingSeasons.style("opacity", 1)
			matchingSeasonLabels.style("opacity", 1)
			matchingChampionshipStars.style("opacity", 1)
		}
	}

	function onSeasonPathMouseLeave(datum) {
		if (filteredSeasons._groups[0].length > 0) {
			filteredSeasons.style("opacity", 1)
			filteredSeasonLabels.style("opacity", 1)
			filteredChampionshipStars.style("opacity", 1)
		} else {
			seasonPaths.style("opacity", 1)
			seasonLabels.style("opacity", 0)
			championshipStars.style("opacity", 1)
			championshipLabels.style("opacity", 1)
		}
		hoverSquare.style("opacity", 0)
		hoverWin.style("opacity", 0)
		hoverHyphen.style("opacity", 0)
		hoverLoss.style("opacity", 0)
		hoverWinPct.style("opacity", 0)
	}

	let allLegendsSelected = true
	let newLegendSelected = false
	let oldLegendTile, currentLegendTile

	function onLegendMouseClick(e, year=null) {
		let x, clickedYear
		if (year !== null && IS_DEFAULT_CLICK) {
			clickedYear = year
		} else {
			[x] = d3.mouse(this)
			clickedYear = legendXScale.invert(x)
		}

		intervalStart = Math.floor(clickedYear / INTERVAL) * INTERVAL
		intervalEnd = intervalStart + (INTERVAL - 1)
		const intervalYears = range(intervalStart, intervalEnd)
		filteredRecordData = getRecordDataFromSeasons(intervalYears, seasonsData)
		filteredSeasons = seasonPaths.filter(d => d >= intervalStart && d <= intervalEnd)
		filteredSeasonLabels = seasonLabels.filter(d => d >= intervalStart && d <= intervalEnd)
		filteredChampionshipStars = championshipStars.filter(d => d >= intervalStart && d <= intervalEnd)
		const filteredLegendTiles = legendTiles.filter(d => d >= intervalStart && d <= intervalEnd)
		const otherLegendTiles = legendTiles.filter(d => d < intervalStart || d > intervalEnd)
		const filteredLegendLabels = legendLabels.filter(d => d >= intervalStart && d <= intervalEnd)
		const otherLegendLabels = legendLabels.filter(d => d < intervalStart || d > intervalEnd)
		
		currentLegendTile = filteredLegendTiles.data()[0]
		newLegendSelected = currentLegendTile !== oldLegendTile

		if (currentLegendTile != null) {
			if (!allLegendsSelected && !newLegendSelected) {
				drawVoronoi(seasons, seasonsData, seasonLinesFormatted, xScale, yScale, dimensions, bounds, onSeasonPathMouseEnter, onSeasonPathMouseLeave, onSeasonPathMouseMove)
				seasonPaths.style("opacity", 1)
				seasonLabels.style("opacity", 0)
				legendTiles.style("opacity", 1).style("stroke-opacity", 0)
				legendLabels.style("opacity", 1).style("stroke", d => primaryTeamColorScale(d))
				championshipStars.style("opacity", 1)
				championshipLabels.style("opacity", 1)
				filteredSeasons = {'_groups': [[]]}
				filteredSeasonLabels = {'_groups': [[]]}
				filteredChampionshipStars = {'_groups': [[]]}

				d3.select('#overall-win').text(recordData['overall']['wins'])
				d3.select('#overall-loss').text(recordData['overall']['losses'])
				d3.select('#overall-win-pct').text(recordData['overall']['win_pct'])

				d3.select('#overall-text').text(recordData['overall']['num_years'] > 1 ? `Overall (${recordData['overall']['num_years']} yrs.)` : `Overall (${recordData['overall']['num_years']} yr.)`)
				d3.select('#best-win').text(recordData['best']['wins'])
				d3.select('#best-loss').text(recordData['best']['losses'])
				d3.select('#best-win-pct').text(recordData['best']['win_pct'])
				d3.select('#best-text').text(`Best (${recordData['best']['year']})`)
				d3.select('#worst-win').text(recordData['worst']['wins'])
				d3.select('#worst-loss').text(recordData['worst']['losses'])
				d3.select('#worst-win-pct').text(recordData['worst']['win_pct'])
				d3.select('#worst-text').text(`Worst (${recordData['worst']['year']})`)
				allLegendsSelected = true
			} else {
				drawVoronoi(intervalYears, seasonsData, seasonLinesFormatted, xScale, yScale, dimensions, bounds, onSeasonPathMouseEnter, onSeasonPathMouseLeave, onSeasonPathMouseMove)
				seasonPaths.style("opacity", seasonFade)
				seasonLabels.style("opacity", 0)
				championshipStars.style("opacity", seasonFade)
				otherLegendTiles.style("opacity", legendFade)
				otherLegendLabels.style("opacity", legendFade).style("stroke", d => primaryTeamColorScale(d))
				filteredSeasons.style("opacity", 1)
				filteredLegendTiles.style("opacity", 1) //.style("stroke-opacity", 1).style("stroke", d => secondaryTeamColorScale(d))
				filteredLegendLabels.style("opacity", 1).style("stroke", d => secondaryTeamColorScale(d))
				filteredSeasonLabels.style("opacity", 1)
				filteredChampionshipStars.style("opacity", 1)

				d3.select('#overall-win').text(filteredRecordData['overall']['wins'])
				d3.select('#overall-loss').text(filteredRecordData['overall']['losses'])
				d3.select('#overall-win-pct').text(filteredRecordData['overall']['win_pct'])
				d3.select('#overall-text').text(filteredRecordData['overall']['num_years'] > 1 ? `Overall (${filteredRecordData['overall']['num_years']} yrs.)` : `Overall (${filteredRecordData['overall']['num_years']} yr.)`)
				d3.select('#best-win').text(filteredRecordData['best']['wins'])
				d3.select('#best-loss').text(filteredRecordData['best']['losses'])
				d3.select('#best-win-pct').text(filteredRecordData['best']['win_pct'])
				d3.select('#best-text').text(`Best (${filteredRecordData['best']['year']})`)
				d3.select('#worst-win').text(filteredRecordData['worst']['wins'])
				d3.select('#worst-loss').text(filteredRecordData['worst']['losses'])
				d3.select('#worst-win-pct').text(filteredRecordData['worst']['win_pct'])
				d3.select('#worst-text').text(`Worst (${filteredRecordData['worst']['year']})`)

				allLegendsSelected = false
			}
		}
		oldLegendTile = currentLegendTile
	}

	if (decade !== null && IS_DEFAULT_CLICK) {
		onLegendMouseClick(null, decade)
		IS_DEFAULT_CLICK = false
	}
}

function drawVoronoi(years, seasonsData, seasonLinesFormatted, xScale, yScale, dimensions, bounds, onMouseEnter, onMouseLeave, onMouseMove) {
	bounds.selectAll(".voronoi").remove()
	const voronoiPoints = getVoronoiPoints(years, seasonsData, seasonLinesFormatted, xScale, yScale)
	const [voronoi, delaunay] = getVoronoi(voronoiPoints, dimensions)
	const voronoiDiagram = bounds.selectAll(".voronoi")
		.data(voronoiPoints)
		.enter()
		.append("path")
			.attr("class", "voronoi")
			.attr("d", (d,i) => voronoi.renderCell(i))
			// .attr("stroke", "salmon")
			.on("mousemove", onMouseMove)
			.on("mouseenter", onMouseEnter)
			.on("mouseleave", onMouseLeave)
}

function getVoronoi(points, dimensions) {
	const delaunay = d3.Delaunay.from(points)
	const voronoi = delaunay.voronoi()
	voronoi.xmax = dimensions.boundedWidth + dimensions.boundedWidth / NUM_GAMES
	voronoi.ymax = dimensions.boundedHeight + dimensions.boundedWidth / NUM_GAMES
	return [voronoi, delaunay]
}

function getVoronoiPoints(seasons, seasonsData, seasonLinesFormatted, xScale, yScale) {
	const gamesSeen = {}
	const points = []
	for (var i = 0; i < seasons.length; i++) {
		const year = seasons[i].toString()
		if (year in seasonsData) {
			const seasonXValues = seasonLinesFormatted[year].map(game => {return xScale(game.loss)})
			const seasonYValues = seasonLinesFormatted[year].map(game => {return yScale(game.win)})
			for (var j = 0; j < seasonXValues.length; j++) {
				const gameX = seasonXValues[j]
				const gameY = seasonYValues[j]
				const gameKey = `${gameX}_${gameY}`
				if (!(gameKey in gamesSeen)) {
					gamesSeen[gameKey] = 1
					points.push([gameX, gameY])
				} else {
					gamesSeen[gameKey] += 1
				}
			}
		}
	}
	return points
}

function getMatchingYearsFromWinsAndLosses(wins, losses, seasons, seasonsData) {
	const matchingYears = []
	const winString = (wins > 9) ? wins.toString() : `0${wins.toString()}`
	const lossString = (losses > 9) ? losses.toString() : `0${losses.toString()}`
	const winLossKey = `${winString}${lossString}`
	for (var i = 0; i < seasons.length; i++) {
		const year = seasons[i]
		const seasonData = seasonsData[year]
		if (winLossKey in seasonData) {
			matchingYears.push(parseInt(year))
		}
	}
	return matchingYears
}


function range(start, end) {
	const range = Array(end - start + 1).fill().map((_, idx) => start + idx)
  	return range
}

function formatSeasonToDrawPath(seasonData, xScale) {
	const sortedKeys = Object.keys(seasonData).sort()
	const winLossData = []
	for (var i = 0; i < sortedKeys.length; i++) {
		winLossData.push(seasonData[sortedKeys[i]])
	}
	const season = [
		[{"win": 0, "loss": -0.5 + xScale.invert(PADDING / 2)}],
		winLossData,
		[{
			"win": winLossData[winLossData.length - 1]["win"],
			"loss": winLossData[winLossData.length - 1]["loss"] + 0.5 - xScale.invert(PADDING / 2)
		}],
	].flat(1)
	return season
}

function makeColors(primaryColor, numDarker=4, numLighter=4, pctDarker=0.64, pctLighter=0.8) {
	primaryColor = d3.rgb(primaryColor)
	const primaryRed = primaryColor.r
	const primaryGreen = primaryColor.g
	const primaryBlue = primaryColor.b

	const darkScale = [primaryColor]
	const darkRedStep = primaryRed * pctDarker / numDarker
	const darkGreenStep = primaryGreen * pctDarker / numDarker
	const darkBlueStep = primaryBlue * pctDarker / numDarker
	for (var i = 0; i < numDarker; i++) {
		const darkerColor = d3.rgb(
			darkScale[i].r - darkRedStep,
			darkScale[i].g - darkGreenStep,
			darkScale[i].b - darkBlueStep,
		)
		darkScale.push(darkerColor)
	}

	const lightScale = [primaryColor]
	const lightRedStep = (255 - primaryRed) * pctLighter / numLighter
	const lightGreenStep = (255 - primaryGreen) * pctLighter / numLighter
	const lightBlueStep = (255 - primaryBlue) * pctLighter / numLighter
	for (var i = 0; i < numLighter; i++) {
		const lighterColor = d3.rgb(
			lightScale[i].r + lightRedStep,
			lightScale[i].g + lightGreenStep,
			lightScale[i].b + lightBlueStep,
		)
		lightScale.push(lighterColor)
	}

	// Remove 1st element to avoid double inclusion
	darkScale.shift()
	const colorScale = [lightScale.reverse(), darkScale].flat(1);
	return colorScale
}

function getIntervalArray(start, end, intervalLength) {
	const startInterval = Math.floor(start / intervalLength) * intervalLength
	const endInterval = Math.floor(end / intervalLength) * intervalLength
	const numIntervals = Math.ceil((endInterval - startInterval) / intervalLength)
	const intervals = [startInterval]
	for (var i = 0; i < numIntervals; i++) {
		const currentInterval = intervals[i] + intervalLength
		intervals.push(currentInterval)
	}
	return intervals
}


function getEmptyWinLossData(n=NUM_GAMES) {
	const emptyWinLossData = []
	for (var i = 0; i <= n; i++) {
		for (var j = 0; j <= n; j++) {
			if (i + j <= n) {
				emptyWinLossData.push({win: i, loss: j})
			}
		}
	}
	return emptyWinLossData
}

// To find the win-loss index, we act like it's an (n+1) x (n+1) square-tiled board (n = NUM_GAMES).
// Imagine for the square-tiled board that we've constructed this representation by looping through
// wins first, then looping through losses resulting in a flat array of ordered (wins, losses) items.
//		[	(0,0), (0,1) ... (0,n)
//			(1,0), (1,1) ... (1,n)
//			...
//			(n,0), (n,1) ... (n,n)	]
//
// The above has the following index structure derived from wins and losses. Note that there are n+1
// items in a given row/column due to the 0-indexed wins/losses. Assume n=82 (n^2 = 6889).
//
//				   			Row         Col 	Index
//		(0,0) -> index = (n+1)(0) 	    + 0      = 0 
//		(x,y) -> index = (n+1)(x) 	    + y 
//		(n,n) -> index = (n+1)(n)       + n 	 = 6888
//
// In our chart, we use the same construction process, but we only allow max(wins + losses) = n.
// This reduces the board to a tiled triangle that has the square's full diagonal:
//
//		(# of triangle tiles) = .5(square-tiles) + .5(diagonal-tiles) = (n^2)/2 + n/2 = 3486
//
// This complicates the index structure only a little. Given wins (x) and losses (y), we act like
// we have a square-tiled board. Then we make an adjustment:
// 
// 		For each row we go up (i.e. each win increment), we have fewer and fewer squares per row. They 
// 		get shorter. If n=82, the sequence goes 82, 81, 80, ... 2, 1. As we move up the rows beyond row 
// 		0, we cumulatively lose tiles. Rows [1, 2, 3, 4, ... n] lose [0, 1, 1+2, 1+2+3, ... n-1(n)/2].
//
//				   			Row         Col 	Adjustment			Index
//		(0,0) -> index = (n+1)(0) 	    + 0         - 0				 = 0
//		(x,y) -> index = (n+1)(x)       + y         - (x-1)(x)/2
//		(n,n) -> index = (n+1)(n)       + n         - (n-1)(n)/2	 = 3485
//
function getTriangleIndex(x, y, n=NUM_GAMES) {
	square_index = (n+1) * x + y
	adjustment = (x-1) * (x) / 2
	index = square_index - adjustment
	return index
}

function drawLogo() {
	// 2. Define Dimensions
	const width = d3.min([
		window.innerWidth * 0.85,
		window.innerHeight * 0.85,
		])
	let dimensions = {
		width: width,
		height: width,
		margin: {
			top: 60,
			right: 45,
			bottom: 60,
			left: 90,
		},
		legendWidth: width * 0.6,
		legendHeight: 20,
	}
	dimensions.boundedWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right
	dimensions.boundedHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom

	// 3. Draw Canvas
	const wrapper = d3.select("#wrapper")
		.append("svg")
			.attr("width", dimensions.width)
			.attr("height", dimensions.height)

	const bounds = wrapper.append("g")
		.attr("class", "bounds")
		.style("transform", `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`)

	const boundsBackground = bounds.append("rect")
		.attr("class", "bounds-background")
		.attr("x", 0)
		.attr("width", dimensions.boundedWidth)
		.attr("y", 0)
		.attr("height", dimensions.boundedHeight)

	bounds.append()
}


async function drawExplanatoryGraph(league) {
	// if (isMobile.any()) {
	// 	d3.select("#scrolly-overlay").style("display", "block").style("visibility", "visible");
	// } else {
	// 	d3.select("#scrolly-side").style("display", "block").style("visibility", "visible");
	// }
	const [wrapper, bounds, dimensions, tiles, tilesGroup, yearIntervals, xScale, yScale] = drawBaseTiles(league, ".explanatory-container", "explanatory-", false)



	const seasonData = await d3.json(`/assets/data/${league}_season_paths.json`)

	const evenSeasons = []
	const evenSeasonTeams = []
	const evenSeasonYears = []
	const teams = Object.keys(seasonData)
	for (var i = 0; i < teams.length; i++) {
		const team = teams[i]
		const seasons = seasonData[team]['seasons']
		const years = Object.keys(seasons)
		for (var j = 0; j < years.length; j++) {
			const year = years[j]
			const season = seasons[year]
			const evenRecord = (league === "NBA") ? "4141" : "1717"
			if (Object.keys(season).includes(evenRecord)) {
				evenSeasons.push(season)
				evenSeasonTeams.push(team)
				evenSeasonYears.push(year)
			}

		}
	}

	let previousWins = 0
	let previousLosses = 0
	let previousState = ''
	const evenSeasonStreakCounts = []
	const evenSeasonDistances = []
	for (var i = 0; i < evenSeasons.length; i++) {
		const evenSeason = evenSeasons[i]
		const evenSeasonStreakCount = 0
		const totalDistance = 0
		const winLossKeys = Object.keys(evenSeason).sort()
		for (var j = 0; j < winLossKeys.length; j++) {
			const winLossKey = winLossKeys[j]
			const wins = evenSeason[winLossKey]['win']
			const losses = evenSeason[winLossKey]['loss']
			const state = wins > previousWins ? 'W' : 'L'

			const expectedWins = j % 2 === 0 ? j / 2 : ((j - 1) / 2) + 1
			const expectedLosses = j % 2 === 0 ? expectedWins : expectedWins - 1
			const distance = Math.abs(expectedWins - wins)
			totalDistance += distance

			if (state === previousState) {
				evenSeasonStreakCount += 1
			}
			previousWins = wins
			previousLosses = losses
			previousState = state
		}
		evenSeasonStreakCounts.push(evenSeasonStreakCount)
		evenSeasonDistances.push(totalDistance)
	}

	const evenSeasonSummary = []
	for (var i = 0; i < evenSeasonTeams.length; i++) {
		const summary = {
			'team': evenSeasonTeams[i],
			'season': evenSeasons[i],
			'year': evenSeasonYears[i],
			'streak': evenSeasonStreakCounts[i],
			'distance': evenSeasonDistances[i],
			'multiplier': evenSeasonStreakCounts[i] * evenSeasonDistances[i]
		}
		evenSeasonSummary.push(summary) 
	}

	// var colours = ["#2c7bb6", "#00a6ca","#00ccbc","#90eb9d","#ffff8c",
	//             "#f9d057","#f29e2e","#e76818","#d7191c"];

	var colours = ['#d73027', '#f46d43', '#fdae61', '#fee08b', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850']

	var heatmapColour = d3.scaleLinear()
		.domain(d3.range(0, 1.1, 1.0 / (colours.length - 1)))
		.range(colours);

	// var heatmapColour = d3.scaleLinear()
	// 	.domain([0,1])
	// 	.range(['#d73027', '#1a9850'])
	// 	.interpolate(d3.interpolateHcl);

	const iterableTiles = tiles._groups[0]
	for (var i = 0; i < iterableTiles.length; i++) {
		const tile = iterableTiles[i]
		const tileId = tile.id
		const winPct = tile.attributes.winPct.value
		const tileById = d3.select(`#${tileId}`)
		// tileById.style("fill", heatmapColour(winPct))
		// tileById.style("opacity", 1)
				
	}

	const seasonLines = []
	const seasonPathIds = []
	const seasonPathColors = []
	const seasonLineGenerator = d3.line()
		.x(d => xScale(lossAccessor(d)) + (dimensions.boundedWidth / NUM_GAMES) / 2)
		.y(d => yScale(winAccessor(d)) + (dimensions.boundedWidth / NUM_GAMES) / 2)

	const pureWinKey = `${NUM_GAMES}00`
	const pureWinSeason = {"0000": {"win": 0, "loss": 0}}
	pureWinSeason[pureWinKey] = {"win": NUM_GAMES, "loss": 0}
	const pureWinSeasonLine = seasonLineGenerator(formatSeasonToDrawPath(pureWinSeason, xScale))
	seasonLines.push(pureWinSeasonLine)
	seasonPathIds.push("pure-win")
	seasonPathColors.push("#1a9850")



	let bestSeason
	if (LEAGUE === NBA) {
		// Golden State Warriors (2017)
 		bestSeason = {"0000": {"win": 0, "loss": 0}, "0100": {"win": 1.0, "loss": 0.0}, "0200": {"win": 2.0, "loss": 0.0}, "0300": {"win": 3.0, "loss": 0.0}, "0400": {"win": 4.0, "loss": 0.0}, "0500": {"win": 5.0, "loss": 0.0}, "0600": {"win": 6.0, "loss": 0.0}, "0700": {"win": 7.0, "loss": 0.0}, "0800": {"win": 8.0, "loss": 0.0}, "0900": {"win": 9.0, "loss": 0.0}, "1000": {"win": 10.0, "loss": 0.0}, "1100": {"win": 11.0, "loss": 0.0}, "1200": {"win": 12.0, "loss": 0.0}, "1300": {"win": 13.0, "loss": 0.0}, "1400": {"win": 14.0, "loss": 0.0}, "1500": {"win": 15.0, "loss": 0.0}, "1600": {"win": 16.0, "loss": 0.0}, "1700": {"win": 17.0, "loss": 0.0}, "1800": {"win": 18.0, "loss": 0.0}, "1900": {"win": 19.0, "loss": 0.0}, "2000": {"win": 20.0, "loss": 0.0}, "2100": {"win": 21.0, "loss": 0.0}, "2200": {"win": 22.0, "loss": 0.0}, "2300": {"win": 23.0, "loss": 0.0}, "2400": {"win": 24.0, "loss": 0.0}, "2401": {"win": 24.0, "loss": 1.0}, "2501": {"win": 25.0, "loss": 1.0}, "2601": {"win": 26.0, "loss": 1.0}, "2701": {"win": 27.0, "loss": 1.0}, "2801": {"win": 28.0, "loss": 1.0}, "2901": {"win": 29.0, "loss": 1.0}, "2902": {"win": 29.0, "loss": 2.0}, "3002": {"win": 30.0, "loss": 2.0}, "3102": {"win": 31.0, "loss": 2.0}, "3202": {"win": 32.0, "loss": 2.0}, "3302": {"win": 33.0, "loss": 2.0}, "3402": {"win": 34.0, "loss": 2.0}, "3502": {"win": 35.0, "loss": 2.0}, "3602": {"win": 36.0, "loss": 2.0}, "3603": {"win": 36.0, "loss": 3.0}, "3703": {"win": 37.0, "loss": 3.0}, "3704": {"win": 37.0, "loss": 4.0}, "3804": {"win": 38.0, "loss": 4.0}, "3904": {"win": 39.0, "loss": 4.0}, "4004": {"win": 40.0, "loss": 4.0}, "4104": {"win": 41.0, "loss": 4.0}, "4204": {"win": 42.0, "loss": 4.0}, "4304": {"win": 43.0, "loss": 4.0}, "4404": {"win": 44.0, "loss": 4.0}, "4504": {"win": 45.0, "loss": 4.0}, "4604": {"win": 46.0, "loss": 4.0}, "4704": {"win": 47.0, "loss": 4.0}, "4804": {"win": 48.0, "loss": 4.0}, "4805": {"win": 48.0, "loss": 5.0}, "4905": {"win": 49.0, "loss": 5.0}, "5005": {"win": 50.0, "loss": 5.0}, "5105": {"win": 51.0, "loss": 5.0}, "5205": {"win": 52.0, "loss": 5.0}, "5305": {"win": 53.0, "loss": 5.0}, "5405": {"win": 54.0, "loss": 5.0}, "5505": {"win": 55.0, "loss": 5.0}, "5506": {"win": 55.0, "loss": 6.0}, "5606": {"win": 56.0, "loss": 6.0}, "5706": {"win": 57.0, "loss": 6.0}, "5806": {"win": 58.0, "loss": 6.0}, "5906": {"win": 59.0, "loss": 6.0}, "6006": {"win": 60.0, "loss": 6.0}, "6106": {"win": 61.0, "loss": 6.0}, "6206": {"win": 62.0, "loss": 6.0}, "6207": {"win": 62.0, "loss": 7.0}, "6307": {"win": 63.0, "loss": 7.0}, "6407": {"win": 64.0, "loss": 7.0}, "6507": {"win": 65.0, "loss": 7.0}, "6607": {"win": 66.0, "loss": 7.0}, "6707": {"win": 67.0, "loss": 7.0}, "6807": {"win": 68.0, "loss": 7.0}, "6808": {"win": 68.0, "loss": 8.0}, "6908": {"win": 69.0, "loss": 8.0}, "6909": {"win": 69.0, "loss": 9.0}, "7009": {"win": 70.0, "loss": 9.0}, "7109": {"win": 71.0, "loss": 9.0}, "7209": {"win": 72.0, "loss": 9.0}, "7309": {"win": 73.0, "loss": 9.0}}
	} else {
		// Phoenix Mercury (2014)
		bestSeason = {"1003": {"win": 10,"loss": 3},"1103": {"win": 11,"loss": 3},"1203": {"win": 12,"loss": 3},"1303": {"win": 13,"loss": 3},"1403": {"win": 14,"loss": 3},"1503": {"win": 15,"loss": 3},"1603": {"win": 16,"loss": 3},"1703": {"win": 17,"loss": 3},"1803": {"win": 18,"loss": 3},"1903": {"win": 19,"loss": 3},"2003": {"win": 20,"loss": 3},"2103": {"win": 21,"loss": 3},"2203": {"win": 22,"loss": 3},"2204": {"win": 22,"loss": 4},"2304": {"win": 23,"loss": 4},"2404": {"win": 24,"loss": 4},"2504": {"win": 25,"loss": 4},"2604": {"win": 26,"loss": 4},"2704": {"win": 27,"loss": 4},"2705": {"win": 27,"loss": 5},"2805": {"win": 28,"loss": 5},"2905": {"win": 29,"loss": 5},"0000": {"win": 0,"loss": 0},"0100": {"win": 1,"loss": 0},"0200": {"win": 2,"loss": 0},"0201": {"win": 2,"loss": 1},"0301": {"win": 3,"loss": 1},"0401": {"win": 4,"loss": 1},"0402": {"win": 4,"loss": 2},"0502": {"win": 5,"loss": 2},"0602": {"win": 6,"loss": 2},"0603": {"win": 6,"loss": 3},"0703": {"win": 7,"loss": 3},"0803": {"win": 8,"loss": 3},"0903": {"win": 9,"loss": 3}}
	}

	const bestSeasonLine = seasonLineGenerator(formatSeasonToDrawPath(bestSeason, xScale))
	seasonLines.push(bestSeasonLine)
	seasonPathIds.push("best-line")
	seasonPathColors.push("#1a9850") // 66bd63


	const middleSeason = {"0000": {'win': 0, 'loss': 0}}
	var middleWins = 0
	var middleLosses = 0

	for (var i = 0; i < NUM_GAMES; i++) {
		if ((i % 2) === 0) {
			middleWins += 1
		} else {
			middleLosses += 1
		}
		const middleWinsText = middleWins < 10 ? `0${middleWins}` : middleWins
		const middleLossText = middleLosses < 10 ? `0${middleLosses}` : middleLosses
		
		const middleKey = `${middleWinsText}${middleLossText}`
		middleSeason[middleKey] = {
			'win': middleWins,
			'loss': middleLosses
		}
	}

	const middleSeasonLine = seasonLineGenerator(formatSeasonToDrawPath(middleSeason, xScale))
	seasonLines.push(middleSeasonLine)
	seasonPathIds.push("middle-line")
	seasonPathColors.push("#fecb3f")


	let mediocreSeason
	if (LEAGUE === NBA) {
		// Miami Heat 2017 (41-41) - weird year
		// mediocreSeason = {"1020": {"win": 10,"loss": 20},"1021": {"win": 10,"loss": 21},"1022": {"win": 10,"loss": 22},"1023": {"win": 10,"loss": 23},"1024": {"win": 10,"loss": 24},"1025": {"win": 10,"loss": 25},"1026": {"win": 10,"loss": 26},"1126": {"win": 11,"loss": 26},"1127": {"win": 11,"loss": 27},"1128": {"win": 11,"loss": 28},"1129": {"win": 11,"loss": 29},"1130": {"win": 11,"loss": 30},"1230": {"win": 12,"loss": 30},"1330": {"win": 13,"loss": 30},"1430": {"win": 14,"loss": 30},"1530": {"win": 15,"loss": 30},"1630": {"win": 16,"loss": 30},"1730": {"win": 17,"loss": 30},"1830": {"win": 18,"loss": 30},"1930": {"win": 19,"loss": 30},"2030": {"win": 20,"loss": 30},"2130": {"win": 21,"loss": 30},"2230": {"win": 22,"loss": 30},"2330": {"win": 23,"loss": 30},"2430": {"win": 24,"loss": 30},"2431": {"win": 24,"loss": 31},"2432": {"win": 24,"loss": 32},"2532": {"win": 25,"loss": 32},"2632": {"win": 26,"loss": 32},"2732": {"win": 27,"loss": 32},"2733": {"win": 27,"loss": 33},"2833": {"win": 28,"loss": 33},"2834": {"win": 28,"loss": 34},"2934": {"win": 29,"loss": 34},"3034": {"win": 30,"loss": 34},"3134": {"win": 31,"loss": 34},"3234": {"win": 32,"loss": 34},"3235": {"win": 32,"loss": 35},"3335": {"win": 33,"loss": 35},"3435": {"win": 34,"loss": 35},"3436": {"win": 34,"loss": 36},"3536": {"win": 35,"loss": 36},"3537": {"win": 35,"loss": 37},"3538": {"win": 35,"loss": 38},"3638": {"win": 36,"loss": 38},"3738": {"win": 37,"loss": 38},"3739": {"win": 37,"loss": 39},"3740": {"win": 37,"loss": 40},"3840": {"win": 38,"loss": 40},"3841": {"win": 38,"loss": 41},"3941": {"win": 39,"loss": 41},"4041": {"win": 40,"loss": 41},"4141": {"win": 41,"loss": 41},"0000": {"win": 0,"loss": 0},"0100": {"win": 1,"loss": 0},"0101": {"win": 1,"loss": 1},"0102": {"win": 1,"loss": 2},"0202": {"win": 2,"loss": 2},"0203": {"win": 2,"loss": 3},"0204": {"win": 2,"loss": 4},"0205": {"win": 2,"loss": 5},"0206": {"win": 2,"loss": 6},"0207": {"win": 2,"loss": 7},"0208": {"win": 2,"loss": 8},"0308": {"win": 3,"loss": 8},"0408": {"win": 4,"loss": 8},"0409": {"win": 4,"loss": 9},"0410": {"win": 4,"loss": 10},"0510": {"win": 5,"loss": 10},"0511": {"win": 5,"loss": 11},"0512": {"win": 5,"loss": 12},"0612": {"win": 6,"loss": 12},"0712": {"win": 7,"loss": 12},"0713": {"win": 7,"loss": 13},"0714": {"win": 7,"loss": 14},"0715": {"win": 7,"loss": 15},"0716": {"win": 7,"loss": 16},"0717": {"win": 7,"loss": 17},"0817": {"win": 8,"loss": 17},"0917": {"win": 9,"loss": 17},"0918": {"win": 9,"loss": 18},"0919": {"win": 9,"loss": 19},"0920": {"win": 9,"loss": 20}}
 		// Seattle Supersonics 1990 (41-41)
 		mediocreSeason = {"1007": {"win": 10,"loss": 7},"1107": {"win": 11,"loss": 7},"1108": {"win": 11,"loss": 8},"1109": {"win": 11,"loss": 9},"1110": {"win": 11,"loss": 10},"1111": {"win": 11,"loss": 11},"1211": {"win": 12,"loss": 11},"1212": {"win": 12,"loss": 12},"1312": {"win": 13,"loss": 12},"1313": {"win": 13,"loss": 13},"1314": {"win": 13,"loss": 14},"1414": {"win": 14,"loss": 14},"1514": {"win": 15,"loss": 14},"1515": {"win": 15,"loss": 15},"1516": {"win": 15,"loss": 16},"1616": {"win": 16,"loss": 16},"1716": {"win": 17,"loss": 16},"1816": {"win": 18,"loss": 16},"1817": {"win": 18,"loss": 17},"1818": {"win": 18,"loss": 18},"1819": {"win": 18,"loss": 19},"1820": {"win": 18,"loss": 20},"1821": {"win": 18,"loss": 21},"1921": {"win": 19,"loss": 21},"1922": {"win": 19,"loss": 22},"2022": {"win": 20,"loss": 22},"2122": {"win": 21,"loss": 22},"2222": {"win": 22,"loss": 22},"2223": {"win": 22,"loss": 23},"2224": {"win": 22,"loss": 24},"2324": {"win": 23,"loss": 24},"2325": {"win": 23,"loss": 25},"2425": {"win": 24,"loss": 25},"2525": {"win": 25,"loss": 25},"2625": {"win": 26,"loss": 25},"2725": {"win": 27,"loss": 25},"2825": {"win": 28,"loss": 25},"2826": {"win": 28,"loss": 26},"2827": {"win": 28,"loss": 27},"2927": {"win": 29,"loss": 27},"2928": {"win": 29,"loss": 28},"3028": {"win": 30,"loss": 28},"3029": {"win": 30,"loss": 29},"3030": {"win": 30,"loss": 30},"3130": {"win": 31,"loss": 30},"3230": {"win": 32,"loss": 30},"3231": {"win": 32,"loss": 31},"3331": {"win": 33,"loss": 31},"3332": {"win": 33,"loss": 32},"3432": {"win": 34,"loss": 32},"3433": {"win": 34,"loss": 33},"3434": {"win": 34,"loss": 34},"3435": {"win": 34,"loss": 35},"3535": {"win": 35,"loss": 35},"3536": {"win": 35,"loss": 36},"3636": {"win": 36,"loss": 36},"3736": {"win": 37,"loss": 36},"3737": {"win": 37,"loss": 37},"3738": {"win": 37,"loss": 38},"3739": {"win": 37,"loss": 39},"3839": {"win": 38,"loss": 39},"3939": {"win": 39,"loss": 39},"3940": {"win": 39,"loss": 40},"4040": {"win": 40,"loss": 40},"4140": {"win": 41,"loss": 40},"4141": {"win": 41,"loss": 41},"0000": {"win": 0,"loss": 0},"0100": {"win": 1,"loss": 0},"0101": {"win": 1,"loss": 1},"0201": {"win": 2,"loss": 1},"0202": {"win": 2,"loss": 2},"0203": {"win": 2,"loss": 3},"0303": {"win": 3,"loss": 3},"0304": {"win": 3,"loss": 4},"0404": {"win": 4,"loss": 4},"0504": {"win": 5,"loss": 4},"0505": {"win": 5,"loss": 5},"0605": {"win": 6,"loss": 5},"0606": {"win": 6,"loss": 6},"0706": {"win": 7,"loss": 6},"0707": {"win": 7,"loss": 7},"0807": {"win": 8,"loss": 7},"0907": {"win": 9,"loss": 7}}
	} else {
		// Washington Mystics 2013 (17-17)
		mediocreSeason = {"1010": {"win": 10,"loss": 10},"1011": {"win": 10,"loss": 11},"1111": {"win": 11,"loss": 11},"1112": {"win": 11,"loss": 12},"1113": {"win": 11,"loss": 13},"1213": {"win": 12,"loss": 13},"1214": {"win": 12,"loss": 14},"1314": {"win": 13,"loss": 14},"1414": {"win": 14,"loss": 14},"1514": {"win": 15,"loss": 14},"1515": {"win": 15,"loss": 15},"1615": {"win": 16,"loss": 15},"1616": {"win": 16,"loss": 16},"1617": {"win": 16,"loss": 17},"1717": {"win": 17,"loss": 17},"0000": {"win": 0,"loss": 0},"0001": {"win": 0,"loss": 1},"0101": {"win": 1,"loss": 1},"0201": {"win": 2,"loss": 1},"0301": {"win": 3,"loss": 1},"0302": {"win": 3,"loss": 2},"0402": {"win": 4,"loss": 2},"0403": {"win": 4,"loss": 3},"0503": {"win": 5,"loss": 3},"0504": {"win": 5,"loss": 4},"0505": {"win": 5,"loss": 5},"0506": {"win": 5,"loss": 6},"0606": {"win": 6,"loss": 6},"0607": {"win": 6,"loss": 7},"0707": {"win": 7,"loss": 7},"0708": {"win": 7,"loss": 8},"0808": {"win": 8,"loss": 8},"0809": {"win": 8,"loss": 9},"0909": {"win": 9,"loss": 9},"0910": {"win": 9,"loss": 10}}
	}
	
	const mediocreSeasonLine = seasonLineGenerator(formatSeasonToDrawPath(mediocreSeason, xScale))
	seasonLines.push(mediocreSeasonLine)
	seasonPathIds.push(`medicore-line-${i}`)
	seasonPathColors.push("#fecb3f") // fee08b



	const pureLossKey = `00${NUM_GAMES}`
	const pureLossSeason = {"0000": {"win": 0, "loss": 0}}
	pureLossSeason[pureLossKey] = {"win": 0, "loss": NUM_GAMES}
	const pureLossSeasonLine = seasonLineGenerator(formatSeasonToDrawPath(pureLossSeason, xScale))
	seasonLines.push(pureLossSeasonLine)
	seasonPathIds.push("pure-loss")
	seasonPathColors.push("#d73027")




	let worstSeason
	if (LEAGUE === NBA) {
		// Philadelphia 76ers
 		worstSeason = {"0000": {"win": 0, "loss": 0}, "0001": {"win": 0.0, "loss": 1.0}, "0002": {"win": 0.0, "loss": 2.0}, "0003": {"win": 0.0, "loss": 3.0}, "0004": {"win": 0.0, "loss": 4.0}, "0005": {"win": 0.0, "loss": 5.0}, "0006": {"win": 0.0, "loss": 6.0}, "0007": {"win": 0.0, "loss": 7.0}, "0008": {"win": 0.0, "loss": 8.0}, "0009": {"win": 0.0, "loss": 9.0}, "0010": {"win": 0.0, "loss": 10.0}, "0011": {"win": 0.0, "loss": 11.0}, "0012": {"win": 0.0, "loss": 12.0}, "0013": {"win": 0.0, "loss": 13.0}, "0014": {"win": 0.0, "loss": 14.0}, "0015": {"win": 0.0, "loss": 15.0}, "0115": {"win": 1.0, "loss": 15.0}, "0116": {"win": 1.0, "loss": 16.0}, "0117": {"win": 1.0, "loss": 17.0}, "0118": {"win": 1.0, "loss": 18.0}, "0119": {"win": 1.0, "loss": 19.0}, "0120": {"win": 1.0, "loss": 20.0}, "0121": {"win": 1.0, "loss": 21.0}, "0221": {"win": 2.0, "loss": 21.0}, "0222": {"win": 2.0, "loss": 22.0}, "0223": {"win": 2.0, "loss": 23.0}, "0224": {"win": 2.0, "loss": 24.0}, "0324": {"win": 3.0, "loss": 24.0}, "0325": {"win": 3.0, "loss": 25.0}, "0326": {"win": 3.0, "loss": 26.0}, "0327": {"win": 3.0, "loss": 27.0}, "0328": {"win": 3.0, "loss": 28.0}, "0329": {"win": 3.0, "loss": 29.0}, "0330": {"win": 3.0, "loss": 30.0}, "0331": {"win": 3.0, "loss": 31.0}, "0332": {"win": 3.0, "loss": 32.0}, "0333": {"win": 3.0, "loss": 33.0}, "0334": {"win": 3.0, "loss": 34.0}, "0335": {"win": 3.0, "loss": 35.0}, "0336": {"win": 3.0, "loss": 36.0}, "0337": {"win": 3.0, "loss": 37.0}, "0338": {"win": 3.0, "loss": 38.0}, "0438": {"win": 4.0, "loss": 38.0}, "0439": {"win": 4.0, "loss": 39.0}, "0440": {"win": 4.0, "loss": 40.0}, "0441": {"win": 4.0, "loss": 41.0}, "0442": {"win": 4.0, "loss": 42.0}, "0443": {"win": 4.0, "loss": 43.0}, "0444": {"win": 4.0, "loss": 44.0}, "0445": {"win": 4.0, "loss": 45.0}, "0446": {"win": 4.0, "loss": 46.0}, "0447": {"win": 4.0, "loss": 47.0}, "0448": {"win": 4.0, "loss": 48.0}, "0449": {"win": 4.0, "loss": 49.0}, "0450": {"win": 4.0, "loss": 50.0}, "0451": {"win": 4.0, "loss": 51.0}, "0452": {"win": 4.0, "loss": 52.0}, "0453": {"win": 4.0, "loss": 53.0}, "0454": {"win": 4.0, "loss": 54.0}, "0455": {"win": 4.0, "loss": 55.0}, "0456": {"win": 4.0, "loss": 56.0}, "0457": {"win": 4.0, "loss": 57.0}, "0458": {"win": 4.0, "loss": 58.0}, "0558": {"win": 5.0, "loss": 58.0}, "0658": {"win": 6.0, "loss": 58.0}, "0659": {"win": 6.0, "loss": 59.0}, "0759": {"win": 7.0, "loss": 59.0}, "0760": {"win": 7.0, "loss": 60.0}, "0860": {"win": 8.0, "loss": 60.0}, "0960": {"win": 9.0, "loss": 60.0}, "0961": {"win": 9.0, "loss": 61.0}, "0962": {"win": 9.0, "loss": 62.0}, "0963": {"win": 9.0, "loss": 63.0}, "0964": {"win": 9.0, "loss": 64.0}, "0965": {"win": 9.0, "loss": 65.0}, "0966": {"win": 9.0, "loss": 66.0}, "0967": {"win": 9.0, "loss": 67.0}, "0968": {"win": 9.0, "loss": 68.0}, "0969": {"win": 9.0, "loss": 69.0}, "0970": {"win": 9.0, "loss": 70.0}, "0971": {"win": 9.0, "loss": 71.0}, "0972": {"win": 9.0, "loss": 72.0}, "0973": {"win": 9.0, "loss": 73.0}}
	} else {
		// Atlanta Dream (2008)
		worstSeason = {"0000": {"win": 0, "loss": 0}, "0001": {"win": 0.0, "loss": 1.0}, "0002": {"win": 0.0, "loss": 2.0}, "0003": {"win": 0.0, "loss": 3.0}, "0004": {"win": 0.0, "loss": 4.0}, "0005": {"win": 0.0, "loss": 5.0}, "0006": {"win": 0.0, "loss": 6.0}, "0007": {"win": 0.0, "loss": 7.0}, "0008": {"win": 0.0, "loss": 8.0}, "0009": {"win": 0.0, "loss": 9.0}, "0010": {"win": 0.0, "loss": 10.0}, "0011": {"win": 0.0, "loss": 11.0}, "0012": {"win": 0.0, "loss": 12.0}, "0013": {"win": 0.0, "loss": 13.0}, "0014": {"win": 0.0, "loss": 14.0}, "0015": {"win": 0.0, "loss": 15.0}, "0016": {"win": 0.0, "loss": 16.0}, "0017": {"win": 0.0, "loss": 17.0}, "0117": {"win": 1.0, "loss": 17.0}, "0217": {"win": 2.0, "loss": 17.0}, "0218": {"win": 2.0, "loss": 18.0}, "0219": {"win": 2.0, "loss": 19.0}, "0319": {"win": 3.0, "loss": 19.0}, "0320": {"win": 3.0, "loss": 20.0}, "0321": {"win": 3.0, "loss": 21.0}, "0322": {"win": 3.0, "loss": 22.0}, "0323": {"win": 3.0, "loss": 23.0}, "0324": {"win": 3.0, "loss": 24.0}, "0325": {"win": 3.0, "loss": 25.0}, "0326": {"win": 3.0, "loss": 26.0}, "0327": {"win": 3.0, "loss": 27.0}, "0328": {"win": 3.0, "loss": 28.0}, "0329": {"win": 3.0, "loss": 29.0}, "0429": {"win": 4.0, "loss": 29.0}, "0430": {"win": 4.0, "loss": 30.0}}
	}

	const worstSeasonLine = seasonLineGenerator(formatSeasonToDrawPath(worstSeason, xScale))
	seasonLines.push(worstSeasonLine)
	seasonPathIds.push("worst-line")
	seasonPathColors.push("#d73027") // f46d43



	// DRAWING EXPLANATORY GRAPH
	const delay = ms => new Promise(res => setTimeout(res, ms));
  	const seasonPaths = bounds.selectAll(".path")
		.data(seasonLines)
		.enter()
		.append("path")
			.attr("class", "explanatory-path")
			.attr("fill", "none")
			.attr("opacity", 0)
			.attr("stroke", (d,i) => seasonPathColors[i]) // year
			.attr("stroke-width", dimensions.boundedWidth / NUM_GAMES - PADDING)
			.attr("id", (d,i) => seasonPathIds[i])
			.attr("d", (d,i) => seasonLines[i]) // season

    const seasonPathWins = [
    	NUM_GAMES,
    	BEST_WINS,
    	NUM_GAMES/2,
    	MEDIOCRE_WINS,
    	0,
    	WORST_WINS
    ]

 //    for (var i = 0; i < seasonPathIds.length; i++) {
	// 	const animationTime = 1500
	// 	const pathId = seasonPathIds[i]
	// 	await delay(2000);
	// 	animateLine(pathId, animationTime)
	// }  
	

	// SEASON_HISTORY[]
	let hoverPct = .75
	if (isMobile.any()) {
		hoverPct = .65
	}
	const hoverStartingPointX = dimensions.boundedWidth * hoverPct
	const hoverWin = bounds.append("text")
		.text('0')
		.attr("class", "record-label")
		.attr("id", 'win-label')
		.attr("x", hoverStartingPointX)
		.attr("y", 40)
		.attr("text-anchor", "end")
		.style("font-size", 30)
		.style("fill", 'none')
		.style("opacity", 0)
	const hoverHyphen = bounds.append("text")
		.text('-')
		.attr("class", "record-label")
		.attr("id", 'hyphen')
		.attr("x", hoverStartingPointX + 14.5)
		.attr("y", 40)
		.attr("text-anchor", "middle")
		.style("font-size", 30)
		.style("fill", 'none')
		.style("opacity", 0)
	const hoverLoss = bounds.append("text")
		.text('0')
		.attr("class", "record-label")
		.attr("id", 'loss-label')
		.attr("x", hoverStartingPointX + 29)
		.attr("y", 40)
		.attr("text-anchor", "start")
		.style("font-size", 30)
		.style("fill", 'none')
		.style("opacity", 0)


	async function updateChart(index, seasonPathIds, seasonPathColors, seasonPathWins, stage, league) {
		const animationTime = 1000
		const fadeOpacity = 0.2

		if (index === -2) {
			return
		} else if (index === -1) {
			if (stage == "exit") {	
				d3.select("#win-label").style("opacity", 0)
				d3.select("#hyphen").style("opacity", 0)
				d3.select("#loss-label").style("opacity", 0)
				// d3.selectAll(".rect-tile").transition(`higlight-tiles`).duration(animationTime).style("opacity", 0.5)
				d3.selectAll("#explanatory-wins-text").style("opacity", 1).attr("fill", "#828282").attr("font-weight", "normal")
				d3.selectAll(".explanatory-win-labels").style("opacity", 1).attr("fill", "#828282").attr("font-weight", "normal")
				d3.selectAll("#explanatory-losses-text").style("opacity", 1).attr("fill", "#828282").attr("font-weight", "normal")
				d3.selectAll(".explanatory-loss-labels").style("opacity", 1).attr("fill", "#828282").attr("font-weight", "normal")
				fadeLine(seasonPathIds[index + 1], animationTime)
			}
			if (stage == "enter") {
				// d3.selectAll(".rect-tile").transition(`higlight-tiles`).duration(animationTime).style("opacity", 0.5)
				d3.selectAll("#explanatory-wins-text").style("opacity", 1).attr("fill", "#1a9850").attr("font-weight", "bold")
				d3.selectAll(".explanatory-win-labels").style("opacity", 1).attr("fill", "#1a9850").attr("font-weight", "bold")
				d3.selectAll("#explanatory-losses-text").style("opacity", 1).attr("fill", "#d73027").attr("font-weight", "bold")
				d3.selectAll(".explanatory-loss-labels").style("opacity", 1).attr("fill", "#d73027").attr("font-weight", "bold")
			}
		} else if (index === 0) {
			if (stage == "enter") {

				d3.selectAll("#explanatory-losses-text").transition(`fade-losses-text`).duration(animationTime).style("opacity", 0.25)
				d3.selectAll(".explanatory-loss-labels").transition(`fade-losses`).duration(animationTime).style("opacity", 0.25)
				// d3.selectAll("#wins-text").transition(`higlight-wins-text`).duration(animationTime).style("opacity", 1).attr("fill", "#1a9850").attr("font-weight", "bold")
				// d3.selectAll(".win-labels").transition(`higlight-wins`).duration(animationTime).style("opacity", 1).attr("fill", "#1a9850").attr("font-weight", "bold")
				// d3.selectAll("#losses-text").transition(`higlight-losses-text`).duration(animationTime).style("opacity", 1).attr("fill", "#d73027").attr("font-weight", "bold")
				// d3.selectAll(".loss-labels").transition(`higlight-losses`).duration(animationTime).style("opacity", 1).attr("fill", "#d73027").attr("font-weight", "bold")
				d3.select("#win-label").style("opacity", 1).style("fill", seasonPathColors[index]).text(parseInt(seasonPathWins[index]))
				d3.select("#hyphen").style("opacity", 1).style("fill", seasonPathColors[index])
				d3.select("#loss-label").style("opacity", 1).style("fill", seasonPathColors[index]).text(parseInt(NUM_GAMES - seasonPathWins[index]))
				animateLine(seasonPathIds[index], animationTime, seasonPathColors[index])
			}
			if (stage == "exit") {
				d3.select("#win-label").style("opacity", 0)
				d3.select("#hyphen").style("opacity", 0)
				d3.select("#loss-label").style("opacity", 0)
				d3.selectAll("#explanatory-losses-text").style("opacity", 1)
				d3.selectAll(".explanatory-loss-labels").style("opacity", 1)
				fadeLine(seasonPathIds[index], animationTime, 0)
			}
		} else if (index === (seasonPathIds.length)) {
			if (stage === "enter") {
				d3.select("#win-label").style("opacity", 0)
				d3.select("#hyphen").style("opacity", 0)
				d3.select("#loss-label").style("opacity", 0)
				d3.selectAll("#explanatory-losses-text").transition(`fade-losses-text`).duration(animationTime).style("opacity", 0.25)
				d3.selectAll(".explanatory-loss-labels").transition(`fade-losses`).duration(animationTime).style("opacity", 0.25)
				fadeLine(seasonPathIds[index - 1], animationTime, fadeOpacity)
			}
			if (stage === "exit") {
				d3.select("#win-label").style("opacity", 1).style("fill", seasonPathColors[index-1]).text(parseInt(seasonPathWins[index-1]))
				d3.select("#hyphen").style("opacity", 1).style("fill", seasonPathColors[index-1])
				d3.select("#loss-label").style("opacity", 1).style("fill", seasonPathColors[index-1]).text(parseInt(NUM_GAMES - seasonPathWins[index-1]))
				d3.selectAll("#explanatory-losses-text").style("opacity", 1)
				d3.selectAll(".explanatory-loss-labels").style("opacity", 1)
				highlightLine(seasonPathIds[index - 1], 0, seasonPathColors[index-1])
			}
		} else {

			if (index === 2) {
				if (stage === "enter") {
					d3.selectAll("#explanatory-wins-text").transition(`fade-wins-text`).duration(animationTime).style("opacity", 0.25)
					d3.selectAll(".explanatory-win-labels").transition(`fade-win-labels`).duration(animationTime).style("opacity", 0.25)
				}
				if (stage === "exit") {
					d3.selectAll("#explanatory-wins-text").style("opacity", 1)
					d3.selectAll(".explanatory-win-labels").style("opacity", 1)
				}
			}

			if (index === 4) {
				if (stage === "enter") {
					d3.selectAll("#explanatory-losses-text").transition(`highlight-losses-text`).duration(animationTime).style("opacity", 1)
					d3.selectAll(".explanatory-loss-labels").transition(`highlight-loss-label`).duration(animationTime).style("opacity", 1)
				}
				if (stage === "exit") {
					d3.selectAll("#explanatory-losses-text").transition(`fade-losses-text`).duration(animationTime).style("opacity", 0.25)
					d3.selectAll(".explanatory-loss-labels").transition(`fade-losses`).duration(animationTime).style("opacity", 0.25)
				}
			} 

			if (stage === "enter") {
				d3.select("#win-label").style("opacity", 1).style("fill", seasonPathColors[index]).text(parseInt(seasonPathWins[index]))
				d3.select("#hyphen").style("opacity", 1).style("fill", seasonPathColors[index])
				d3.select("#loss-label").style("opacity", 1).style("fill", seasonPathColors[index]).text(parseInt(NUM_GAMES - seasonPathWins[index]))
				fadeLine(seasonPathIds[index - 1], animationTime, fadeOpacity)
				animateLine(seasonPathIds[index], animationTime, seasonPathColors[index])
			}
			if (stage === "exit") {
				d3.select("#win-label").style("opacity", 1).style("fill", seasonPathColors[index-1]).text(parseInt(seasonPathWins[index-1]))
				d3.select("#hyphen").style("opacity", 1).style("fill", seasonPathColors[index-1])
				d3.select("#loss-label").style("opacity", 1).style("fill", seasonPathColors[index-1]).text(parseInt(NUM_GAMES - seasonPathWins[index-1]))
				highlightLine(seasonPathIds[index - 1], 0, seasonPathColors[index-1])
				fadeLine(seasonPathIds[index], animationTime, 0)
			}
		}
	}

	const container = d3.select('*[id^=scrolly-]');
	const stepSel = container.selectAll('*[class^=step]');

	enterView({
		selector: stepSel.nodes(),
		offset: 0.6,
		enter: el => {
			const index = parseInt(d3.select(el).attr('data-index'));
			updateChart(index, seasonPathIds, seasonPathColors, seasonPathWins, "enter", league);
		},
		exit: el => {
			let index = parseInt(d3.select(el).attr('data-index'));
			updateChart(index, seasonPathIds, seasonPathColors, seasonPathWins, "exit", league);
		}
	});
}




export default { init, resize };
