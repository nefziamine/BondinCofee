package com.example.backend.controller;

import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class IndexController implements ErrorController {

    @RequestMapping("/error")
    public String handleError() {
        return "forward:/index.html";
    }

    @GetMapping(value = {"/", "/{x:[\\w\\-]+}"})
    public String forward() {
        return "forward:/index.html";
    }
}
