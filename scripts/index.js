import MoviesScrapper from './MoviesScrapper.js'

const movieScrapper = new MoviesScrapper;
window.MoviesScrapper = movieScrapper;
window.MoviesScrapper.loadMovies();
