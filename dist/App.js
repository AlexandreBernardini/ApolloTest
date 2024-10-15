import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './Pages/Home';
import './App.css';
const App = () => {
    return (React.createElement(React.Fragment, null,
        React.createElement(BrowserRouter, null,
            React.createElement("div", { id: "top" }),
            React.createElement("section", { className: 'content', id: 'content' },
                React.createElement(Routes, null,
                    React.createElement(Route, { path: "/", element: React.createElement(Home, null) }))))));
};
export default App;
