<template>
    <div>
        <b-navbar toggleable="md" type="light">
            <b-navbar-toggle target="nav_collapse"></b-navbar-toggle>
            <b-navbar-brand>Reverse Sheep</b-navbar-brand>
            <b-collapse is-nav id="nav_collapse">
                <b-navbar-nav>
                    <b-nav-item>
                        <router-link to="/">Home</router-link>
                    </b-nav-item>
                    <b-nav-item>
                        <router-link to="/history">User History</router-link>
                    </b-nav-item>
                    <b-nav-item>
                        <router-link to="/leaderboard">Leaderboard</router-link>
                    </b-nav-item>
                    <b-nav-item>
                        <router-link to="/aces">Aces</router-link>
                    </b-nav-item>
                </b-navbar-nav>
            </b-collapse>
        </b-navbar>
    </div>
</template>
<script>
    export default {};
</script>