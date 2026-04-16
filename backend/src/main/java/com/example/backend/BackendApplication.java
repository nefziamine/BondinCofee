package com.example.backend;

import com.example.backend.model.User;
import com.example.backend.model.ProfileUser;
import com.example.backend.repository.UserRepository;
import com.example.backend.repository.ProfileRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableJpaRepositories("com.example.backend.repository")
@EntityScan("com.example.backend.model")
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

	@Bean
	CommandLineRunner initDatabase(UserRepository userRepository, ProfileRepository profileRepository) {
		return args -> {
			// Seed demo users
			if (userRepository.count() == 0) {
				User emp = new User();
				emp.setEmail("employee@cafesbondin.tn");
				emp.setPassword("123456");
				emp.setNomUtilisateur("Collaborateur Demo");
				emp.setRole("EMPLOYE");
				userRepository.save(emp);

				User admin = new User();
				admin.setEmail("admin@cafesbondin.tn");
				admin.setPassword("123456");
				admin.setNomUtilisateur("Administrateur Maison");
				admin.setRole("ADMIN");
				userRepository.save(admin);

				User rh = new User();
				rh.setEmail("rh@cafesbondin.tn");
				rh.setPassword("123456");
				rh.setNomUtilisateur("Ressources Humaines");
				rh.setRole("RH");
				userRepository.save(rh);

				User it = new User();
				it.setEmail("it@cafesbondin.tn");
				it.setPassword("123456");
				it.setNomUtilisateur("Support IT");
				it.setRole("IT");
				userRepository.save(it);

				// Seed a profile for the demo employee
				ProfileUser profile = new ProfileUser();
				profile.setUserId(emp.getId()); // Map to the user ID
				profile.setNomComplet("Collaborateur Demo");
				profile.setEmail("employee@cafesbondin.tn");
				profile.setDepartment("Logistique");
				profile.setPoste("Responsable Torréfaction");
				profile.setTelephone("+216 71 000 000");
				profile.setExperience("12 ans d'excellence");
				profile.setUserId(emp.getId());
				profile.setImageurl("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200");
				profileRepository.save(profile);
			}
		};
	}

}
