var shelljs = require("shelljs");
var fs = require ("fs");
var shows = fs.readFileSync("./shows.txt", "utf8").split("\n");

shows.forEach((show) => {
	var downloadOptions = {};
	var artist = null;
	var date = null;
	var venue = null;
	var baseUrl = show.split("/").pop();
	var savedFile = null;
	var poster = null;
	var responseHtml = shelljs.exec(`wget -qO- ${show}`).stdout;
	var tracks = `${responseHtml.split("Play('jw6',")[1].split("],")[0]}]`;
	
	responseHtml.match(/"title":"(\d+)\.\s(.+?)"/gi).forEach((match) => {
		var track = match.match(/(\d+)\. /)[1];
		var songTitle = match.match(/\. (.+)"/)[1].replace(/\\/, "");
		tracks[track] = songTitle;
	});

	responseHtml.replace(/itemprop="datePublished">(.+)<\/span>/, (match, concertDate) => {
		date = concertDate.replace(/-/g, ".");
	});

	responseHtml.replace(/\?query=venue.+"(\s.+)?>(.+)<\/a>/, (match, optionalCg, concertVenue) => {
		venue = concertVenue;
	});

	responseHtml.replace(/<span itemprop=\"creator\">(.+)<\/span>/, (match, concertArtist) => {
		artist = concertArtist;
	});

	responseHtml.replace(/link itemprop=\"image\" href=\"(.+\.(jpg|png).+)\"/, (match, concertPoster, extension) => {
		poster = concertPoster + extension;
	});
	
	shelljs.exec(`mkdir "/home/dustunix/Downloads/${artist} - ${date}"`);
	
	if (poster) {
		shelljs.exec(`wget "${poster}" -O "/home/dustunix/Downloads/${artist} - ${date}/folder.jpg"`);
	}

	JSON.parse(tracks).forEach((track) => {
		shelljs.exec(`wget "https://archive.org/download/${baseUrl}/${track.orig}" -P "/home/dustunix/Downloads/${artist} - ${date}"`);	
	});
});