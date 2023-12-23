import {
    Canister,
    update,
    query,
    Record,
    text,
    nat64,
    Vec,
    Result,
    StableBTreeMap,
    ic,
    bool,
} from 'azle';
import { v4 as uuidv4 } from 'uuid';

const course = Record({
    idCourse: text,
    nameCourse: text,
    semesterCreditSemester: nat64,
    createdAt: nat64,
    updatedAt: nat64,
});

const student = Record({
    idStudent: text,
    nameStudent: text,
    semesterStudent: text,
    courseStudent: Vec(course),
    semesterCreditSemesterTotal: nat64,
    paymentStudent: nat64,
    alreadyPay: bool,
    createdAt: nat64,
    updatedAt: nat64,
});

const semester = Record({
    idSemester: text,
    semesterCreditSemester: nat64,
    createdAt: nat64,
    updatedAt: nat64,
});

type Course = typeof course | any;
let courseDatabase = StableBTreeMap<text, Course>(3);

type Student = typeof student | any;
let studentDatabase = StableBTreeMap<text, Student>(4);

type Semester = typeof semester | any;
let semesterDatabase = StableBTreeMap<text, Semester>(2);

export default Canister({
    createStudent: update([text, text], Result(student, text), (name, semester) => {
        try {
            const uniqueStudentId = uuidv4();
            if (!name || !semester) {
                throw new Error('Name/Semester must be added');
            }

            const newStudent: Student = {
                idStudent: uniqueStudentId,
                nameStudent: name,
                semesterStudent: semester,
                courseStudent: [],
                semesterCreditSemesterTotal: 0n,
                paymentStudent: 4000000n,
                alreadyPay: false,
                createdAt: ic.time(),
                updatedAt: ic.time(),
            };

            studentDatabase.insert(uniqueStudentId, newStudent);
            return Result.Ok(newStudent);
        } catch (err) {
            return Result.Err('Error Creating Student [' + err + ']');
        }
    }),

    createCourse: update([text, nat64], Result(course, text), (nameCourse, creditSemester) => {
        try {
            const uniqueCourseId = uuidv4();
            if (!nameCourse) {
                throw new Error('Name must be added');
            }

            const newCourse: Course = {
                idCourse: uniqueCourseId,
                nameCourse: nameCourse,
                semesterCreditSemester: creditSemester,
                createdAt: ic.time(),
                updatedAt: ic.time(),
            };

            courseDatabase.insert(uniqueCourseId, newCourse);
            return Result.Ok(newCourse);
        } catch (err) {
            return Result.Err('Error Creating Course [' + err + ']');
        }
    }),

    getAllStudent: query([], Vec(student), () => {
        return studentDatabase.values();
    }),

    getAllCourse: query([], Vec(course), () => {
        return courseDatabase.values();
    }),

    getAllSemester: query([], Vec(semester), () => {
        return semesterDatabase.values();
    }),

    getOnceStudent: query([text], student, (id) => {
        const studentData = studentDatabase.get(id);
        if ('None' in studentData) {
            return `The Student with id=${id} not found`;
        }
        return studentData.Some;
    }),

    payment: update([text, nat64], Result({ ...student, kembalian: nat64 }, text), (idStudent, total) => {
        try {
            const studentData: Student = studentDatabase.get(idStudent).Some;
            if (total < studentData['paymentStudent']) {
                throw new Error('Please Check Your Money');
            }

            studentData['paymentStudent'] = 0n;
            studentData['alreadyPay'] = true;
            studentDatabase.insert(studentData['idStudent'], studentData);
            return Result.Ok({ ...studentData, kembalian: total - studentData['paymentStudent'] });
        } catch (err) {
            return Result.Err('Error Payment [' + err + ']');
        }
    }),

    addCourseStudent: update([text, text], Result(student, text), (idUser, idCourse) => {
        try {
            let dataStudent: Student = studentDatabase.get(idUser).Some;
            let dataCourse: Course = courseDatabase.get(idCourse).Some;
            let dataSemester: Semester = semesterDatabase.get(dataStudent['semesterStudent']).Some;

            dataStudent['semesterCreditSemesterTotal'] += dataCourse['semesterCreditSemester'];

            if (
                !idUser ||
                !idCourse ||
                dataStudent['semesterCreditSemesterTotal'] > 25 ||
                dataStudent['alreadyPay'] == true
            ) {
                throw new Error('Error ID User/ ID Course/ Max Semester Credit Semester = 25 / Already Pay');
            }

            if (dataSemester['semesterCreditSemester'] < dataStudent['semesterCreditSemesterTotal']) {
                dataStudent['paymentStudent'] += BigInt(1000000);
            }

            dataStudent['courseStudent'] = [...dataStudent['courseStudent'], dataCourse];
            studentDatabase.insert(idUser, dataStudent);
            return Result.Ok(dataStudent);
        } catch (err) {
            return Result.Err('Error Exchange [' + err + ']');
        }
    }),
});
