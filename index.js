const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const app = express()

const { initializeDatabase } = require('./db/db.connect')
const Project = require('./models/project.models')
const Task = require('./models/task.models')
const Team = require('./models/team.models')
const User = require('./models/user.models')
const Tag = require('./models/tag.models')

app.use(cors())
app.use(express.json())
initializeDatabase()

const JWT_SECRET = 'your_jwt_secret'

app.get('/', (req, res) => {
    res.json({ok: true, message: "app is working."})
})

//1. add a task

app.post('/tasks', async(req, res) => {
    try{
        const newTask = new Task(req.body)
        if(!newTask.name) return res.status(400).json({error: "Name is required."})
        if(!newTask.project) return res.status(400).json({error: "Project is required."})
        if(!newTask.team) return res.status(400).json({error: "Team is required."})
        if(!newTask.owners || !Array.isArray(newTask.owners) || newTask.owners.length === 0) return res.status(400).json({error: "Owners is required."})
        if(!newTask.tags || !Array.isArray(newTask.tags) || newTask.tags.length === 0) return res.status(400).json({error: "Tags is required."})
        if(!newTask.timeToComplete) return res.status(400).json({error: "timeToComplete is required."})
        if(!newTask.status) return res.status(400).json({error: "Status is required."})

        await newTask.save()
        res.status(201).json({message: "Task created.", task: newTask})

    }catch(error){
        res.status(500).json({error: "Failed to add a Task", details: error.message})
    }
})

//2. add a team

app.post('/teams', async (req, res) => {
    try{
        const newTeam = new Team(req.body)
        if(!newTeam.name) return res.status(400).json({error: "name is required."})
        if(!newTeam.description) return res.status(400).json({error: "description is required."})

        await newTeam.save()
        res.status(201).json({message: "Team is added", team: newTeam})

    }catch(error){
        res.status(500).json({error: "Failed to add team", details: error.message})
    }
})

//3. add a project

app.post('/projects', async (req, res) => {
    try{
        const newProject = new Project(req.body)
        if(!newProject.name) return res.status(400).json({error: "name is required."})
        if(!newProject.description) return res.status(400).json({error: "description is required."})

        await newProject.save()
        res.status(201).json({message: "Project is added", project: newProject})

    }catch(error){
        res.status(500).json({error: "Failed to add a project", details: error.message})
    }
})

//4. get all the task
app.get('/tasks', async(req, res) => {
    try{
        const task = await Task.find().populate("owners", "name").populate("team", "name")
        if(task.length !== 0){
            res.json(task)
        }else{
            res.status(404).json({error: "No tasks found"})
        }
    }catch(error){
        res.status(500).json({error: "Failed to fetch tasks", details: error.message})
    }
})

//5. get all teams
app.get('/teams', async(req, res) => {
    try{
        const teams = await Team.find()
        if(teams !== 0){
            res.json(teams)
        }else{
            res.status(404).json({error: "No teams found."})
        }
        
    }catch(error){
        res.status(500).json({error: "Failed to fetch teams", details: error.message})
    }
})

//6.get all projects
app.get('/projects', async(req, res) => {
    try{
        const projects = await Project.find()
        if(projects !== 0){
            res.json(projects)
        }else{
            res.status(404).json({error: "No projects found."})
        }
        
    }catch(error){
        res.status(500).json({error: "Failed to fetch projects", details: error.message})
    }
})

//7. delete projects by id
 
async function deleteProject(id){
    try{
        const deletedProject = await Project.findByIdAndDelete(id)
        return deletedProject
    }catch(error){
        throw error
    }
}

app.delete('/projects/:id', async(req, res) => {
    try{
        const deletedProject = await deleteProject(req.params.id)
        if(deletedProject){
            res.status(200).json({message: "Projects deleted successfully."})
        } else{
            res.status(404).json({error: "Projects not found."})
        }

    }catch(error){
        res.status(500).json({error: "Failed to delete projects", details: error.message})
    }
})

//8. delete teams by id

async function deleteTeam(id){
    try{
        const deletedTeam = await Team.findByIdAndDelete(id)
        return deletedTeam
    }catch(error){
        throw error
    }
}

app.delete('/teams/:id', async(req, res) => {
    try{
        const deletedTeam = await deleteTeam(req.params.id)
        if(deletedTeam){
            res.status(200).json({message: "Teams deleted successfully."})
        } else{
            res.status(404).json({error: "Teams not found."})
        }
        
    }catch(error){
        res.status(500).json({error: "Failed to delete teams", details: error.message})
    }
})

//9. delete tasks by id

async function deleteTask(id){
    try{
        const deletedTask = await Task.findByIdAndDelete(id)
        return deletedTask
    }catch(error){
        throw error
    }
}

app.delete('/tasks/:id', async (req, res) => {
    try{
        const deletedTask = await deleteTask(req.params.id)
        if(deletedTask){
            res.status(200).json({message: "Tasks deleted succesfully."})
        }else{
            res.status(404).json({error: "Tasks not found."})
        }
        
    }catch(error){
        res.status(500).json({error: "Failed to delete tasks", details: error.message})
    }
})

//10. JWT middleware

const verifyJWT = (req, res, next) => {
    const token = req.headers['authorization']
    if(!token){
        return res.status(401).json({ message: "No token provided." })
    }

    try{
        const decodedToken = jwt.verify(token, JWT_SECRET)
        req.user = decodedToken
        next()
    }catch(error){
        return res.status(401).json({message: "Invalid token."})
    }
}

//11. auth route for sign up, for adding new user/owner

app.post('/auth/signup', async(req, res) => {
    try{
        const { name, email, password } = req.body
        if(!name || !email || !password){
            return res.status(400).json({error: "All fields are required."})
        }

        const existingUser = await User.findOne({ email })

        if(existingUser){
            return res.status(409).json({error: "email already registered."})
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        
        const newUser = new User({
            name,
            email, 
            password: hashedPassword
        })

        await newUser.save()
        res.status(201).json({message: "User registered successfully."})

    }catch(error){
        res.status(500).json({error: "Signup failed", details: error.message})
    }
})

//12. auth route for log in

app.post('/auth/login', async (req, res) => {
    try{
        const {email, password} = req.body
        if(!email || !password){
            return res.status(400).json({error: "email and password required."})
        }

        const user = await User.findOne({ email }).select('+password')
        if(!user) return res.status(401).json({error: "Invalid credentials."})

        const isMatch = await bcrypt.compare(password, user.password)
        if(!isMatch) return res.status(401).json({error: "Invalid credentials"})
        
        const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, {expiresIn: '24h'})

        res.json({message: "Login successfully", token})

    }catch(error){
        res.status(500).json({error: "Login failed", details: error.message})
    }
})

//13. get authenticate user details

app.get('/auth/me', verifyJWT, async(req, res) => {
    try{
        const user = await User.findById(req.user.userId).select('-password')
        if(!user) return res.status(404).json({error: "user not found."})
        res.json({user})
    }catch(error){
        res.status(500).json({error: "Failed to fetch user", details:  error.message})
    }
})

//14. list of all user(owners)

app.get('/users', async(req, res) => {
    try{
        const users = await User.find().select('-password')
        if(users !== 0){
            res.json(users)
        }else{
            res.status(404).json({error: "no users found."})
        }

    }catch(error){
        res.status(500).json({error: "Failed to fetch users", details: error.message})
    }
})

//15. delete user by id
async function deleteUser(id){
    try{
        const deletedUser = await User.findByIdAndDelete(id)
        return deletedUser
    }catch(error){
        throw error
    }
}

app.delete('/users/:id', async(req, res) => {
    try{
        const deletedUser = await deleteUser(req.params.id)
        if(deletedUser){
            res.status(200).json({message: "User deleted successfully."})
        }else{
            res.status(404).json({error: "User not found."})
        }

    }catch(error){
        res.status(500).json({error: "Failed to delete user", details: error.message})
    }
})

//16. get all the tags

app.get('/tags', async (req, res) => {
    try{
        const tags = await Tag.find()
        if(tags !== 0){
            res.json(tags)
        }else{
            res.status(404).json({error: "no tags found."})
        }

    }catch(error){
        res.status(500).json({error: "Failed to fetch tags", details: error.message})
    }
})

//17. add new tags
app.post('/tags', async (req, res) => {
    try{
        const tags = new Tag(req.body)
        if(!tags.name) return res.status(400).json({error: "name is required."})

        await tags.save()
        res.status(201).json({message: "tag is added", tag: tags})

    }catch(error){
        res.status(500).json({error: "Failed to add tags", details: error.message})
    }
})


//18. update a task by id

app.put('/tasks/:id', async (req, res) => {
  try {
    await Task.findByIdAndUpdate(
  req.params.id,
  { ...req.body, updatedAt: Date.now() },
  { new: true }
);

    const updatedTask = await Task.findById(req.params.id)
      .populate("owners")
      .populate("team")
      .populate("tags");

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//REPORTS - 

//19. total work done last week

app.get('/reports/work-done-last-week', async (req, res) => {
  try {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const completedTasks = await Task.countDocuments({
      status: "Completed",
      updatedAt: { $gte: lastWeek }
    });

    res.json({ totalWorkDoneLastWeek: completedTasks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


//20. total days of work pending

app.get('/reports/pending-work-days', async (req, res) => {
  try {
    const result = await Task.aggregate([
      { $match: { status: { $ne: "Completed" } } },
      {
        $group: {
          _id: null,
          totalDays: { $sum: "$timeToComplete" }
        }
      }
    ]);

    res.json({ pendingWorkDays: result[0]?.totalDays || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


//21. tasks closed by team

app.get('/reports/tasks-closed-by-team', async (req, res) => {
  try {
    const data = await Task.aggregate([
      { $match: { status: "Completed" } },
      {
        $group: {
          _id: "$team",
          closedTasks: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "teams",
          localField: "_id",
          foreignField: "_id",
          as: "team"
        }
      },
      { $unwind: "$team" },
      {
        $project: {
          _id: 0,
          teamName: "$team.name",
          closedTasks: 1
        }
      }
    ]);

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//22. tasks closed by owner

app.get('/reports/tasks-closed-by-owner', async (req, res) => {
  try {
    const data = await Task.aggregate([
      { $match: { status: "Completed" } },
      { $unwind: "$owners" },
      {
        $group: {
          _id: "$owners",
          closedTasks: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "owner"
        }
      },
      { $unwind: "$owner" },
      {
        $project: {
          _id: 0,
          ownerName: "$owner.name",
          closedTasks: 1
        }
      }
    ]);

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.use((req, res) => {
    res.status(404).json({error: "Not found."})
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log("Server is running on the PORT", PORT)
})