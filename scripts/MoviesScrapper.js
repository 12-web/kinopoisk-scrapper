export default class MoviesScrapper {
  constructor() {
    this.movies = [];
    this._baseUrl = 'https://us-central1-proxy-24e43.cloudfunctions.net/api?url=https://www.kinopoisk.ru';
  }

  // парсинг страницы
  async _parsePage(page) {
    const textPage = await page.text();
    const parser = new DOMParser();
    return parser.parseFromString(textPage, "text/html");
  }

  // получение старницы с фильмом
  async _getFilmPage(url) {
    try {
        const page = await fetch(`${this._baseUrl}/${url}`, {
          headers: {
            'Content-Type': 'text/html'
          }
        })
        const textPage = await this._parsePage(page);
        this._createMovieElement(textPage);
      } catch(err) {
        console.log(err)
      }
  }

  // формирование объекта с фильмом
  _createMovieElement(page) {
    const commonTitle = page.querySelector('[data-tid="75209b22"]').textContent;
    let titleRu = page.querySelector('[data-tid="75209b22"]').textContent.replace(/^ +| +$|( ) +|\n|( )?\(\w{4}\)/g, '');
    titleRu = titleRu.replace(/\n/g, ' ');

    const titleEn = page.querySelector('.styles_originalTitle__JaNKM');
    let description = page.querySelector('[data-tid="bbb11238"]').textContent.replace(/^ +| +$|( ) /g, '');
    description = description.replace(/\n/g, ' ');
    const year = Number(commonTitle.match(/[0-9]{4}/));
    const country = page.querySelector('a[href*=country]').textContent;
    const genres = Array.from(page.querySelectorAll('a[href*=genre]')).map(genre => genre.textContent);
    const director = page.evaluate("//*[contains(text(), 'Режиссер')]", page, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
    .singleNodeValue
    .nextElementSibling
    .childNodes[1]
    .textContent
    const poster = page.querySelector('.film-poster').src;
    const budget = page.querySelector('a[href*=box]');
    const rating = Number(page.querySelector('[data-tid="939058a8"]').textContent);
    const rank = parseInt(page.querySelector('.styles_position__pm10U').textContent);
    const time = parseInt(page.evaluate("//*[contains(text(), 'Время')]", page, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
    .singleNodeValue
    .nextElementSibling
    .textContent);
    const actors = Array.from(page.querySelectorAll('[itemprop="actor"]')).map(actor => actor.textContent);
    const minAge = parseInt(page.querySelector('[data-tid="5c1ffa33"]').textContent);

    this.movies.push({
      id: rank,
      titleRu: titleRu,
      titleEn: titleEn ? titleEn.textContent.replace(/\n/g, '') : 'не указан',
      description: description,
      poster: poster,
      year: year,
      country: country,
      genres: genres,
      director: director,
      budget: budget ? budget.textContent : 'не указан',
      rating: rating,
      time: time,
      actors: actors,
      minAge: minAge,
    });
  }

  // формирование массива ссылок
  _collectFilmsLink(page) {
    const filmsAnchors = Array.from(page.querySelectorAll('[data-tid="23a2a59"]'));

    if(filmsAnchors.length) {
      const filmLinks = filmsAnchors.map(anchor => {
          const anchorHref = anchor.href;
          return anchorHref.slice(anchorHref.indexOf('film'));
        })
      return filmLinks;
    }
  }

  // обход по ссылка для сбора информации
  _getFilmsPages(linkArray) {
    linkArray.forEach((link) => {
      this._getFilmPage(link)
    });
  }

  // вывод результата в консоль
  _consoleResult(option, positiveResult) {
    const result = option ? positiveResult : 'Ничего не найдено';
    console.log(result);
  }

  // прохождение по страницам для получения ссылок на фильмы
  async _scanFilmsLinks(iterator) {

    for await (const page of iterator) {
      this._getFilmsPages(this._collectFilmsLink(page))
    }

  }

  // получение информации о списке с фильмов со страницы
  async _getFilmsPageInformation(pageNumber) {
    try {
      const page = await fetch(`${this._baseUrl}/lists/movies/top250/?page=${pageNumber}`, {
        headers: {
          'Content-Type': 'text/html'
        }
      });
      const parsPage = await this._parsePage(page);
      return parsPage;
    } catch(err) {
      console.log(err);
    }
  }

  // получение страницы со списком фильмов
  async *_getFilmListPage() {
    let isExistedFilm = true;
    let pageNumber = 1
    while(isExistedFilm) {
      const parsPage = await this._getFilmsPageInformation(pageNumber);
      isExistedFilm = parsPage.querySelector('a[href*="/film/"]');
      if(isExistedFilm === null) { break };
      pageNumber++;
      yield parsPage;
      }
  }

  //поиск по названию фильма
  findMovie(name) {
    const nameQuery = name.toLowerCase().split(' ');
    const filteredFilms = this.movies.filter(movie => {

    if(movie.titleRu.toLowerCase().split(' ').includes(nameQuery[0])) { return movie }

    });

    this._consoleResult(filteredFilms.length, filteredFilms);

  }

  // получить фильм по id
  getMovie(id) {
    this.movies.some(movie => {
      if(movie.id === id) { console.log(movie) } ;
    });
  }

  // поиск фильма по году
  getMoviesByYear(year) {
    const filteredMovies = this.movies.filter(movie => movie.year === Number(year));

    this._consoleResult(filteredMovies.length, filteredMovies);
  }

  // получить произвольный фильм
  getRandomMovie(genre) {

    if(genre) {
      const filtereMovies = this.movies.filter(movie => movie.genres.includes(genre))
      const rundomNumber = Math.floor(Math.random() * filtereMovies.length);

      this._consoleResult(filtereMovies.length, filtereMovies[rundomNumber]);
    } else {
      const rundomNumber = Math.floor(Math.random() * this.movies.length);
      console.log(this.movies[rundomNumber])
    }

  }

  // поиск фильмы по времени
  getTimeCorrespondFilm(min, max) {
    const filteredFilms = this.movies.filter(movie => {
      return movie.time >= Number(min) && movie.time <= Number(max);
    });

    this._consoleResult(filteredFilms.length, filteredFilms);
  }

  // поиск фильмы по рейтингу
  getRantingCorrespondFilm(rating) {
    const filteredFilms = this.movies.filter(movie => {
      return movie.rating >= Number(rating);
    });

    this._consoleResult(filteredFilms.length, filteredFilms);
  }

  // сортировка фильмов по рейтингу
  getRatingSortMovies() {
    const key = 'id'
    const sortedFilms = this.movies.sort((movies1, movies2) => movies1[key] > movies2[key] ? 1 : -1);
    console.log(sortedFilms)
  }

  // поиск фильма по актеру
  getFilmWithActor(actor) {
    const filteredFilms = this.movies.filter(movie => {
      return movie.actors.includes(actor);
    });

    this._consoleResult(filteredFilms.length, filteredFilms);
  }

  // запуск загрузки фильмов
  loadMovies() { this._scanFilmsLinks(this._getFilmListPage()) }
}
