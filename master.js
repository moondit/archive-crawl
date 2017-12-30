var shelljs = require("shelljs");
var fs = require ("fs");
var os = require("os");
var path = require("path");
var shows = fs.readFileSync("./shows.txt", "utf8").split("\n").filter((show) => show.match(/archive.org/));
var commander = require("commander")
	.option("-p, --path [path]", "The directory that you want to save the files to", `${os.homedir()}/Downloads`)
	.option("-s, --shows [path]", "The supplied text file of archive shows that you want to download", "./shows.txt")
	.parse(process.argv);

function buildFolders(fullPath) {
	var foldersToCreate = fullPath.replace(commander.path, "").slice(1).split("/");
	var directory = commander.path;

	foldersToCreate.forEach((folder) => {
		directory = path.join(directory, folder);
		if (!fs.existsSync(directory)) {
			fs.mkdirSync(directory);
		}
	});
}

shows.forEach((show) => {
	var artist = null;
	var date = null;
	var venue = null;
	var baseUrl = show.split("/").pop();
	var savedFile = null;
	var poster = null;
	var year = null;
	var responseHtml = shelljs.exec(`wget -qO- ${show}`).stdout;
	var tracks = `${responseHtml.split("Play('jw6',")[1].split("],")[0]}]`;
	
	responseHtml.match(/"title":"(\d+)\.\s(.+?)"/gi).forEach((match) => {
		var track = match.match(/(\d+)\. /)[1];
		var songTitle = match.match(/\. (.+)"/)[1].replace(/\\/, "");
		tracks[track] = songTitle;
	});

	responseHtml.replace(/itemprop="datePublished">(.+)<\/span>/, (match, concertDate) => {
		date = concertDate.replace(/-/g, ".");
		year = date.slice(0, 4);
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

	responseHtml.replace(/Location<\/span>(?:.|\s)+?href=".+"\s+>(.+)<\/a>/, (match, concertLocation) => {
		location = concertLocation;
	});


	var folderName = `${date} ${venue}, ${location}`;
	var fullPath = path.join(commander.path, artist, year, folderName);	

	buildFolders(fullPath);

	if (poster) {
		var folderPath = path.join(fullPath, "folder.jpg");
		var origImage = path.join(fullPath, "folder.jpg") 
		var newImage = path.join(fullPath, "folder-c.jpg") 
		shelljs.exec(`wget "${poster}" -O "${folderPath}"`);
		shelljs.exec(`convert "${folderPath}" -resize 500 -quality 90 "${fullPath}/folder-c.jpg"`);
	

		var origImageSize = fs.statSync(origImage).size;
		var newImageSize = fs.statSync(newImage).size;

		if (origImageSize < newImageSize) {
			fs.unlinkSync(newImage);
		} else {
			fs.unlinkSync(origImage);
			fs.renameSync(newImage, origImage);
		}
	}

	JSON.parse(tracks).forEach((track, index) => {
		if (index > 0) { return; }
		shelljs.exec(`wget "https://archive.org/download/${baseUrl}/${track.orig}" -P "${fullPath}"`);	
	});
});