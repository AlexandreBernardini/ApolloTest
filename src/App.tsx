import React from 'react';
import {BrowserRouter, Route, Routes} from 'react-router-dom';
import Home from './Pages/Home';
import './App.css';

const App: React.FC = () => {
  return (
      <>
        <BrowserRouter>
          <div id="top"></div>
          <section className='content' id='content'>
            <Routes>
              <Route path="/" element={<Home/>}/>
            </Routes>
          </section>
        </BrowserRouter>
      </>
  );
};

export default App;